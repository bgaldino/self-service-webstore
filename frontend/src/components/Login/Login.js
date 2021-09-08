import React, { useState } from "react";
import PropTypes from "prop-types";

import "./Login.css";

// Used to log in the user by fetching the token
async function loginUser(credentials) {
  let requestHeaders = new Headers();

  let formdata = new FormData();
  formdata.append("grant_type", "password");
  // Configure these fields in the Salesforce Org
  formdata.append("client_id", `${process.env.REACT_APP_CONNECTED_APP_ID}`);
  formdata.append(
    "client_secret",
    `${process.env.REACT_APP_CONNECTED_APP_SECRET}`
  );

  // Takes in the data provided from the user in the form
  formdata.append("username", credentials.username);
  formdata.append("password", credentials.password);

  let requestOptions = {
    method: "POST",
    headers: requestHeaders,
    body: formdata,
    redirect: "follow",
  };

  let token = "";
  await fetch(
    `${process.env.REACT_APP_API_ENDPOINT}/services/oauth2/token`,
    requestOptions
  )
    .then((response) => response.text())
    .then((result) => {
      // If a valid token is returned, save the value and return it
      let json = JSON.parse(result);
      if (json.error) {
        return token;
      } else {
        const parsedResult = JSON.parse(result);
        token = parsedResult.access_token;
        localStorage.setItem("userid", parsedResult.id.split('/')[5]);
      }
    })
    .catch((error) => console.log("error", error));

  return token;
}

export default function Login({ setToken }) {
  const [username, setUserName] = useState();
  const [password, setPassword] = useState();
  const [error, setError] = useState();

  // Triggered when the user presses the log in button
  const handleSubmit = async (e) => {
    e.preventDefault();
    setError();
    const token = await loginUser({
      username,
      password,
    });
    // If a valid token is returned, set it for use throughout the application
    if (token.length === 0) {
      setError("Invalid login. Please try again.");
    } else {
      setToken(token);
    }
  };

  return (
    <div className="login-wrapper">
      <h3>Sign in</h3>
      <form className="login-form" onSubmit={handleSubmit}>
        <div className="login-inputs">
          <label>
            <p>Username</p>
            <input type="text" onChange={(e) => setUserName(e.target.value)} />
          </label>
        </div>

        <div className="login-inputs">
          <label>
            <p>Password</p>
            <input
              type="password"
              onChange={(e) => setPassword(e.target.value)}
            />
          </label>
        </div>
        <div>
          {error ? (
            <p
              style={{
                color: "red",
                textAlign: "center",
                fontSize: "2vh",
              }}
            >
              {error}
            </p>
          ) : (
            ""
          )}
          <button
            style={{ backgroundColor: "rgb(0, 112, 210)", width: "100%" }}
            class="btn btn-primary"
            type="submit"
          >
            Log in
          </button>
        </div>
      </form>
    </div>
  );
}

Login.propTypes = {
  setToken: PropTypes.func.isRequired,
};
