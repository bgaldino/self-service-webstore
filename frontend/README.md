# Self Service Webstore
This is a web application written in React that allows users to simulate a shopping cart experience for products in a Salesforce org.

## Setup
This project has been deployed on GitHub pages and the following instructions are also for GitHub pages deployment.  **This means that TMP Auth is required to access the deployed application.**  
### Salesforce Org Configuration

#### CORS
- In Lightning, go to the Setup gear icon in the top right corner of the page.
- Search `CORS`
- Ensure that the `Enable CORS for OAuth endpoints` box is checked
- In the Allowed Origins List, select New and add the base URL of where the app will be hosted
  - For GitHub pages, this is https://git.soma.salesforce.com

#### Connected Apps
- From the Setup page, search for `App Manager`
- In the top right corner, select `New Connected App`
- Enter values for the top 3 required fields
- Ensure that `Enable OAuth Settings` is checked
- For the callback URL, enter the Allowed Origin URL from the previous step
- For `Selected OAuth Scopes`, ensure `Manage user data via APIs (api)` is present
- Click save
- A value for Consumer Key should now be present on the screen as well as a revealable Consumer Secret. Temporarily note these values as they will be required for the application.

### Development

#### Initial Setup
- Ensure Node.js is installed on your machine
- Clone this repository
- Run `npm i` from the root directory

#### Environment
- In the root directory of this app, create a file called `.env`
- Paste the following lines in this file:
```
REACT_APP_API_ENDPOINT=  
REACT_APP_API_VERSION=  
REACT_APP_CONNECTED_APP_ID=  
REACT_APP_CONNECTED_APP_SECRET=  
REACT_APP_PRICEBOOK_ID=  
REACT_APP_ACCOUNT_ID=

```
- For the value of API_ENDPOINT, add your organization`s base URL
- For API_VERSION, enter the preferred version (ex. 53.0)
- For CONNECTED_APP_ID, enter the Consumer Key value from the org setup step
- For CONNECTED_APP_SECRET, enter the Consumer Secret value form the org setup step
- For the purpose of this app, it is assumed that a single pricebook is being used. Enter this pricebook`s id for PRICEBOOK_ID

#### Deployment
- In package.json, replace the homepage value with your preferred URL to access the website
- For GitHub pages, run `npm run deploy`
  - **NOTE: This app will not run on a localhost due to CORS restrictions for Salesforce orgs.**
- In the `Settings` tab of your repo, go to `GitHub Pages` and select the source as the `gh-pages` branch. You will now see a URL that can be used to access the deployed application.

#### Using the app
- Upon loading the application in the browser, you will be prompted for a login if you have not already done so. Enter the credentials you would use to sign into the Salesforce org whose URL has been provided in the .env file.
- After successfully authenticating, the app will be able to make API requests and properly function.
