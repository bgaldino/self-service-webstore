# Streaming Proxy
Simple Node.js app that uses JSForce to connect to streaming push topics. The need for this arises from the Streaming API not supporting CORS as well as the dedicated JSForce proxy not supporting streaming events. This app works by subscribing to the push topic through a JSForce client and emitting these events to socket.io which is then consumed by the client, mitigating the use of CORS.

### Setup
Set up your Heroku env variables by running the following commands:
`heroku config:set LOGIN_URL=`  
`heroku config:set USERNAME=`  
`heroku config:set PASSWORD=`  
Append your org's credentials to the end of each line.

### Deployment
- Add files
- Commit changes
- `git push heroku master`


### Using the stream
- Socket.io should be used on the client side to consume the events. The URL will be that of the Heroku app.
- The SOCKET_ENDPOINT constant declared at the top of Assets.js will need to be updated with this value on the client side.