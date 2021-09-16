import React, { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import useToken from "./useToken";
import smartbytes from "../images/smartbytes.png"

export default function OrderConfirmation() {
  const { orderId } = useParams();
  const { token, setToken } = useToken();

  return (
    <div className="container">
      <div className="order-header">
      <img className="header-image" src={smartbytes}/>
        <div style={{ 'padding-left': '1em' }}>
          <h4>Order Confirmation #{orderId}</h4>
          <h5>Thank you for your order!</h5>
        </div>
      </div>
    </div>
  );
}
