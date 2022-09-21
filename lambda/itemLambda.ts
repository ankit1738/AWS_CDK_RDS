import { APIGatewayEvent } from "aws-lambda";
// import * as mysql from "mysql2/promise.js";
// const mysql2 = require("mysql2/promise");
// import * as mysql from "mysql2/promise";
import * as mysql from "mysql";
interface ApiError {
  statusCode: number;
  message: string;
}
exports.handler = async (event: APIGatewayEvent) => {
  try {
    console.log("Inside lambda handler");
    // setInterval(function () {}, 1000);

    let connection = await getConnection();
    // "CREATE TABLE Persons (PersonID int,LastName varchar(255),FirstName varchar(255),Address varchar(255),City varchar(255))"
    // INSERT INTO Persons (PersonID ,LastName ,FirstName ,Address ,City) values (1 ,'Kumar' ,'Ankit' ,'HSR Layout' ,'Bangalore')"
    console.log("Connection here", connection);
    const result = await runQuery(connection, "SELECT * from Persons");
    await endConnection(connection);

    return {
      statusCode: 200,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ sucess: true, message: "Response from lambda" }),
    };
  } catch (error) {
    const err = error as ApiError;
    console.log("Error here", err);
    return {
      statusCode: err.statusCode,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ sucess: false, message: err.message }),
    };
  }
};

let getConnection = async () => {
  const connection = mysql.createConnection({
    host: "", // host for connection
    port: 3306, // default port for mysql is 3306
    user: "admin",
    password: "",
    database: "MySqlDb",
  });

  return new Promise((resolve, reject) => {
    connection.connect(function (err) {
      if (err) {
        console.log("error occurred while connecting");
        reject("err");
      } else {
        console.log("connection created with Mysql successfully");
        resolve(connection);
      }
    });
  });
};

let endConnection = async (connection: any) => {
  return new Promise((resolve, reject) => {
    connection.end(function (err: any) {
      // The connection is terminated now
      if (err) {
        console.error("[connection.end]err: " + err);

        connection.destroy();
      }
      resolve("succed");
    });
  });
};

let runQuery = async (connection: any, sql: any) => {
  return new Promise((resolve, reject) => {
    connection.query(sql, (error: any, results: any, fields: any) => {
      if (error) {
        console.log("Error in running query", error);
        reject(error);
      }
      console.log(results);
      resolve(results);
    });
  });
};
