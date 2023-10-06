const express = require("express");
const { open } = require("sqlite");
const sqlite3 = require("sqlite3");
const path = require("path");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");

const app = express();
app.use(express.json());

let database = null;

const dbPath = path.join(__dirname, "covid19IndiaPortal.db");

const initailizeDBAndServer = async () => {
  try {
    database = await open({
      filename: dbPath,
      driver: sqlite3.Database,
    });
    app.listen(3000, () => {
      console.log("Server started successfully at port 3000");
    });
  } catch (error) {
    console.log(`Database error ${error.message}`);
    process.exit(1);
  }
};

initailizeDBAndServer();

const authenticateJwtToken = (request, response, next) => {
  let jwtToken;
  const authHeaders = request.headers["authorization"];
  if (authHeaders !== undefined) {
    jwtToken = authHeaders.split(" ")[1];
  }
  if (jwtToken === undefined) {
    response.status(401);
    response.send("Invalid JWT Token");
  } else {
    jwt.verify(jwtToken, "secret_token", async (error, payload) => {
      next();
    });
  }
};

///User Registration
app.post("/login/", async (request, response) => {
  const { username, password } = request.body;

  const isUserExistQuery = `
    SELECT * FROM user
    WHERE username = '${username}';`;

  const userDetails = await database.get(isUserExistQuery);

  if (userDetails === undefined) {
    response.status(400);
    response.send("Invalid user");
  } else {
    const userPassword = userDetails.password;
    const isPasswordMatched = await bcrypt.compare(password, userPassword);

    if (isPasswordMatched) {
      const payload = {
        username: username,
      };
      const jwtToken = jwt.sign(payload, "secret_token");
      response.send({
        jwtToken,
      });
    } else {
      response.status(400);
      response.send("Invalid password");
    }
  }
});

//API-2 get all states
app.get("/states/", authenticateJwtToken, async (request, response) => {
  const getAllStatesQuery = `
    SELECT 
      state_id as stateId,
      state_name as stateName,
     population
    FROM 
      state`;

  const allStates = await database.all(getAllStatesQuery);
  response.send(allStates);
});

// API-3 get state based on ID
app.get(
  "/states/:stateId/",
  authenticateJwtToken,
  async (request, response) => {
    const { stateId } = request.params;
    const getStateQuery = `
    SELECT 
      state_id as stateId,
      state_name as stateName,
      population
    FROM state
    WHERE state_id = ${stateId};`;
    const stateDetails = await database.get(getStateQuery);
    response.send(stateDetails);
  }
);

//API-4 create district
app.post("/districts/", authenticateJwtToken, async (request, response) => {
  const { districtName, stateId, cases, cured, active, deaths } = request.body;
  const createQuery = `
    INSERT INTO district(district_name,state_id,cases,cured,active,deaths)
    VALUES(
        '${districtName}',
        '${stateId}',
        ${cases},
        ${cured},
        ${active},
        ${deaths}
    )`;
  await database.run(createQuery);
  response.send("District Successfully Added");
});

// API-5 get state based on ID
app.get(
  "/districts/:districtId/",
  authenticateJwtToken,
  async (request, response) => {
    const { districtId } = request.params;
    const getStateQuery = `
    SELECT 
      district_id as districtId,
      district_name as districtName,
      state_id as stateId,
      cases,
      cured,
      active,
      deaths
    FROM district
    WHERE district_id = ${districtId};`;

    const districtDetails = await database.get(getStateQuery);
    response.send(districtDetails);
  }
);

// API-6 delete district of id
app.delete(
  "/districts/:districtId/",
  authenticateJwtToken,
  async (request, response) => {
    const { districtId } = request.params;
    const deleteQuery = `
    DELETE FROM district
    WHERE district_id = ${districtId};`;

    await database.run(deleteQuery);
    response.send("District Removed");
  }
);

//API-7 update details
app.put(
  "/districts/:districtId/",
  authenticateJwtToken,
  async (request, response) => {
    const { districtId } = request.params;
    const {
      districtName,
      stateId,
      cases,
      cured,
      active,
      deaths,
    } = request.body;

    const updateDistrictQuery = `
    UPDATE 
      district
    SET
      district_name = '${districtName}',
      state_id = '${stateId}',
      cases = ${cases},
      cured = ${cured},
      active = ${active},
      deaths = ${deaths}
    WHERE 
      district_id = ${districtId};`;

    await database.run(updateDistrictQuery);
    response.send("District Details Updated");
  }
);

// API-8 Get stats
app.get(
  "/states/:stateId/stats/",
  authenticateJwtToken,
  async (request, response) => {
    const { stateId } = request.params;

    const getStatsQuery = `
    SELECT
      SUM(cases) as totalCases,
      SUM(cured) as totalCured,
      SUM(active) as totalActive,
      SUM(deaths) as totalDeaths
    FROM
      district
    WHERE state_id = ${stateId};`;

    const stats = await database.get(getStatsQuery);
    response.send(stats);
  }
);

module.exports = app;
