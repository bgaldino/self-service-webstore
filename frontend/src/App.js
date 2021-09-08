import React, { useState } from "react";
import { HashRouter, Link, Route, Switch } from "react-router-dom";

import Home from "./components/Home";
import Cart from "./components/Cart";
import Login from "./components/Login/Login";
import Assets from "./components/Assets/Assets";
import Drawer from './components/Drawer';
import OrderConfirmation from "./components/OrderConfirmation";
import useToken from "./components/useToken";

function App() {
  const [cart, setCart] = useState(
    JSON.parse(localStorage.getItem("cart")) || []
  );
  const { token, setToken } = useToken();

  // Require that the user be logged in to access any app content
  if (!token) {
    return <Login setToken={setToken} />;
  }

  const getCartTotal = () => {
    return cart.reduce((sum, { quantity }) => sum + quantity, 0);
  };

  const logout = () => {
    setToken();
    setCart([]);
    localStorage.removeItem("cart");
    return localStorage.removeItem("token");
  };

  return (
    <HashRouter basename="/webstore">
      <div className="App">
        <Drawer cartTotal={getCartTotal()} logout={logout}></Drawer>
        <Switch>
          <Route exact path="/">
            <Home cart={cart} setCart={setCart} />
          </Route>
          <Route path="/cart">
            <Cart cart={cart} setCart={setCart} />
          </Route>
          <Route path="/assets">
            <Assets cart={cart} setCart={setCart} />
          </Route>
          <Route path="/confirmation/:orderId">
            <OrderConfirmation />
          </Route>
        </Switch>
      </div>
    </HashRouter>
  );
}

export default App;
