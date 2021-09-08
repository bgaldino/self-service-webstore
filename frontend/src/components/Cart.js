import React, { useEffect, useState } from "react";
import Link from "@material-ui/core/Link";
import useToken from "./useToken";
import { Col, Container, Row } from "react-bootstrap";
import Select from "react-select";
import { useHistory } from "react-router-dom";
import moment from "moment";

// Card images
import mastercard from "../images/mastercard.png";
import visa from "../images/visa.jpg";
import diners from "../images/diners.png";
import jcb from "../images/jcb.png";
import maestro from "../images/maestro.png";
import amex from "../images/amex.png";

const BASE_URL = `${process.env.REACT_APP_API_ENDPOINT}/services/data/v${process.env.REACT_APP_API_VERSION}`;

export default function Cart({ cart, setCart }) {
  const { token, setToken } = useToken();
  const [loading, setLoading] = useState(true);
  const [orderExecuting, setOrderExecuting] = useState(false);

  const [paymentOptions, setPaymentOptions] = useState();
  const [selectedPayment, setSelectedPayment] = useState(null);
  const history = useHistory();

  // Calculate the cart sum
  const getTotalSum = () => {
    let raw = cart.reduce(
      (sum, { netPrice, quantity }) => sum + netPrice * quantity,
      0
    );
    return (Math.round(raw * 100) / 100).toFixed(2);
  };

  const clearCart = () => {
    setCart([]);
  };

  // Return the appropriate image for each payment method
  function getCardImage(card) {
    switch (card) {
      case "MasterCard":
        return mastercard;
      case "Jcb":
        return jcb;
      case "Visa":
        return visa;
      case "AmericanExpress":
        return amex;
      case "Maestro":
        return maestro;
      case "DinersClub":
        return diners;
    }
  }

  // Create the request body for calling the BuyNow API
  function constructBuyNowBody() {
    let effectiveDate = moment(new Date()).format("YYYY-MM-DD").toString();
    let raw = {
      inputs: [
        {
          order: {
            attributes: {
              type: "Order",
            },
            AccountId: `${process.env.REACT_APP_ACCOUNT_ID}`,
            EffectiveDate: effectiveDate,
            EndDate: null,
            Pricebook2Id: `${process.env.REACT_APP_PRICEBOOK_ID}`,
            Status: "Draft",
            CurrencyIsoCode: "USD",
          },
          orderItems: new Array(),
          paymentMethodId: selectedPayment.value,
        },
      ],
    };
    // Go through each item in the cart and create an OrderItem entry
    let index = 0;
    for (index; index < cart.length; index++) {
      let product = cart[index];
      let entry = {
        attributes: {
          type: "OrderItem",
        },
        UnitPrice: parseFloat(product.unitPrice),
        PricebookEntryId: `${product.Id}`,
        Quantity: product.quantity,
        ProductSellingModelId: `${product.ProductSellingModelId}`,
        TaxTreatmentId: "1ttR000000001BqIAI",
        CurrencyIsoCode: "USD",
      };
      raw.inputs[0].orderItems.push(entry);
    }
    return JSON.stringify(raw);
  }

  // SObject API call to query saved CardPaymentMethods
  async function getPaymentMethods() {
    let requestHeaders = new Headers();
    requestHeaders.append("Authorization", "Bearer " + token);
    requestHeaders.append("Content-Type", "application/json");

    let requestOptions = {
      method: "GET",
      headers: requestHeaders,
      redirect: "follow",
    };

    await fetch(
      `${BASE_URL}/queryAll/?q=SELECT CardCategory,CardHolderFirstName,CardHolderLastName,CardLastFour,CardTypeCategory,NickName,Status,Id FROM CardPaymentMethod WHERE Status = 'Active'`,
      requestOptions
    )
      .then((response) => response.text())
      .then((result) => {
        let payments = JSON.parse(result).records;
        let options = new Array();
        // Use the result to populate the picklist of payment methods
        for (let i = 0; i < payments.length; i++) {
          let card = payments[i];
          options.push({
            value: card.Id,
            label: (
              <div>
                <img
                  src={getCardImage(card.CardTypeCategory)}
                  style={{ width: "10%" }}
                />{" "}
                {card.CardTypeCategory} x{card.CardLastFour}
              </div>
            ),
          });
        }
        if (options.length > 0) {
          setSelectedPayment(options[0]);
        }
        setPaymentOptions(options);
      })
      .catch((error) => console.log("error", error));
  }

  // Call the BuyNow API
  const executeBuyNow = async () => {
    if (paymentOptions.length == 0 || selectedPayment == null) {
      alert("No payment method selected. Please try again.");
      return;
    }
    setOrderExecuting(true);
    let requestHeaders = new Headers();
    requestHeaders.append("Authorization", "Bearer " + token);
    requestHeaders.append("Content-Type", "application/json");
    let requestBody = constructBuyNowBody();
    let requestOptions = {
      method: "POST",
      headers: requestHeaders,
      body: requestBody,
      redirect: "follow",
    };
    await fetch(
      `${BASE_URL}/actions/custom/flow/Buy_Now_Assets_Final`,
      requestOptions
    )
      .then((response) => response.text())
      .then((result) => {
        let orderInfo = JSON.parse(result)[0];
        if (orderInfo.isSuccess) {
          let orderNumber = orderInfo.outputValues.orderOutput.OrderNumber;
          setOrderExecuting(false);
          clearCart();
          // Redirect to order confirmation page upon success
          history.push(`/confirmation/${orderNumber}`);
        } else {
          console.log(orderInfo);
          setOrderExecuting(false);
          alert("Order unsucccessful. Please try again.");
        }
      })
      .catch((error) => console.log("error", error));
  };

  // Creates the request body for the pricing engine API using all pricebook entries
  function constructPricingBody() {
    let raw = {
      listPricebookId: `${process.env.REACT_APP_PRICEBOOK_ID}`,
      candidatePricebookIds: [`${process.env.REACT_APP_PRICEBOOK_ID}`],
      pricingFlow: "GET_FINAL_PRICE",
      roundingMode: "RoundHalfUp",
      graph: {
        graphId: "1",
        records: [
          {
            referenceId: "ref_sales_txn",
            record: {
              attributes: {
                type: "SalesTransaction",
              },
              CurrencyIsoCode: "USD",
            },
          },
        ],
      },
    };

    // Go through pricebook entries and construct a request for each one
    let index = 1;
    for (index; index <= cart.length; index++) {
      let product = cart[index - 1];
      let entry = {
        referenceId: "ref_sales_txn_item" + index,
        record: {
          attributes: {
            type: "SalesTransactionItem",
          },
          CurrencyIsoCode: "USD",
          SalesTransactionId: "@{ref_sales_txn.Id}",
          ProductId: product.Product2Id,
          Quantity: `${product.quantity}`,
          ProductSellingModelId: product.ProductSellingModelId,
        },
      };
      raw.graph.records.push(entry);
    }
    return JSON.stringify(raw);
  }

  // Call the pricing engine API to calculate final prices for all cart items
  async function getPrices() {
    let requestHeaders = new Headers();
    requestHeaders.append("Authorization", "Bearer " + token);
    requestHeaders.append("Content-Type", "application/json");
    let requestBody = constructPricingBody();

    let requestOptions = {
      method: "POST",
      headers: requestHeaders,
      body: requestBody,
      redirect: "follow",
    };

    setLoading(true);
    await fetch(
      `${BASE_URL}/commerce/pricing/salestransaction/actions/calculate-price`,
      requestOptions
    )
      .then((response) => response.text())
      .then((result) => {
        let pricingData = JSON.parse(result);
        let index = 1;
        let adjustmentIndex = index + cart.length;
        for (index; index <= cart.length; index++) {
          let product = cart[index - 1];

          let unitPrice = pricingData.records[index].record.ListPrice;
          let netPrice = pricingData.records[index].record.NetUnitPrice;
          let totalPrice = pricingData.records[index].record.TotalPrice;

          let adjustment =
            pricingData.records[index].record.TotalAdjustmentAmount;
          // Round and format prices
          product.unitPrice = (Math.round(unitPrice * 100) / 100).toFixed(2);
          product.netPrice = (Math.round(netPrice * 100) / 100).toFixed(2);
          product.adjustment = (Math.round(adjustment * 100) / 100).toFixed(2);
          product.totalPrice = (product.netPrice * product.quantity).toFixed(2);
          product.priceChange = (
            Math.round(Math.abs(unitPrice - netPrice) * 100) / 100
          ).toFixed(2);

          // Handle any adjustments
          if (adjustment != 0) {
            let priceAdjustmentItem = pricingData.records[adjustmentIndex];

            product.adjustmentDesc = priceAdjustmentItem.record.Description; // Description/reason for adjustment
            let adjustmentVal = priceAdjustmentItem.record.AdjustmentValue; // Amount
            let adjustmentType = priceAdjustmentItem.record.AdjustmentType; // Type
            let totalAdjustment = priceAdjustmentItem.record.TotalAmount;
            // Create a string to render the adjustment details
            let adjustmentString = "";
            switch (adjustmentType) {
              case "AdjustmentPercentage":
                adjustmentString += Math.abs(adjustmentVal).toString() + "%";
                break;
              case "AdjustmentAmount":
                adjustmentString +=
                  "$" +
                  (Math.round(Math.abs(adjustmentVal) * 100) / 100)
                    .toFixed(2)
                    .toString();
                break;
            }
            if (totalAdjustment > 0) {
              adjustmentString += " addl. charge";
            } else {
              adjustmentString += " off";
            }
            product.adjustmentString = adjustmentString;
            adjustmentIndex++;
          }
        }
      })
      .catch((error) => console.log("error", error));
  }

  async function populateData() {
    await getPrices();
    await getPaymentMethods();
    setLoading(false);
  }

  // Swap wording for terms
  function convertUnitTerm(term) {
    switch (term) {
      case "Days":
        return "daily";
      case "Months":
        return "monthly";
      case "Years":
        return "yearly";
    }
    return term;
  }

  useEffect(() => {
    populateData();
    localStorage.setItem("cart", JSON.stringify(cart));
  }, [cart]);

  // Update item quantities
  const setQuantity = (prod, amount) => {
    const newCart = [...cart];
    newCart.find((product) => product.Name === prod.Name).quantity = amount;
    setCart(newCart);
  };

  const removeFromCart = (productToRemove) => {
    setCart(cart.filter((product) => product !== productToRemove));
  };

  return (
    <>
      {loading ? (
        <img
          style={{ margin: "auto", display: "flex" }}
          src="https://miro.medium.com/max/1080/0*DqHGYPBA-ANwsma2.gif"
        />
      ) : (
        <div className="container">
          <div className="page-header">
            <div style={{'padding-left': '1em'}}>
              <h5>Cart</h5>
              Here is what you've added so far.
            </div>
          </div>
          <div>
            {cart.map((product, idx) => (
              <ul
                className="collection"
                style={{ width: "100%", margin: "auto" }}
              >
                <li className="collection-item" key={product.Id}>
                  <Container style={{ width: "100%" }}>
                    <Row>
                      <Col
                        className="cart-col"
                        style={{ width: "10%", position: "relative" }}
                      >
                        {product.img && (
                          <img
                            src={product.img}
                            alt={product.img}
                            style={{
                              width: "75%",
                              margin: "0",
                              position: "absolute",
                              transform: "translateY(50%)",
                              top: "50%",
                            }}
                          />
                        )}
                      </Col>
                      <Col className="cart-col">
                        <div className="item-desc">
                          <h5 style={{ overflowWrap: "break-word" }}>
                            {product.Name}
                          </h5>
                          {product.adjustment == 0 ? (
                            <b>
                              Price: ${product.unitPrice}{" "}
                              {product.sellingModel == "Evergreen" && (
                                <span>
                                  {convertUnitTerm(product.pricingTermUnit)}
                                </span>
                              )}
                            </b>
                          ) : (
                            <div>
                              <span>Unit price: ${product.unitPrice}</span>
                              <br />
                            </div>
                          )}
                          {product.adjustment > 0 && (
                            <span style={{ color: "green" }}>
                              Surcharges: +$
                              {product.priceChange}
                              <span>
                                {" "}
                                ({product.adjustmentString} -{" "}
                                {product.adjustmentDesc})
                              </span>
                            </span>
                          )}
                          {product.adjustment < 0 && (
                            <span style={{ color: "red" }}>
                              Discounts: -$
                              {product.priceChange}
                              <span>
                                {" "}
                                ({product.adjustmentString} -{" "}
                                {product.adjustmentDesc})
                              </span>
                            </span>
                          )}
                          <p>
                            {product.adjustment != 0 && (
                              <b>
                                Price: ${product.netPrice}{" "}
                                {product.sellingModel == "Evergreen" && (
                                  <span>
                                    {convertUnitTerm(product.pricingTermUnit)}
                                  </span>
                                )}{" "}
                                {product.sellingModel === "TermDefined" && (
                                  <span>
                                    for {product.pricingTerm}{" "}
                                    {product.pricingTermUnit.toLowerCase()}
                                  </span>
                                )}
                              </b>
                            )}
                          </p>
                        </div>
                      </Col>
                      <Col
                        className="cart-col col-center"
                        style={{ marginTop: "2%" }}
                      >
                        <p>
                          <b>Quantity: {product.quantity}</b>
                        </p>
                        <div className="add-remove">
                          <Link to="/">
                            <i
                              className="material-icons"
                              style={{ color: "#039be5" }}
                              onClick={() => {
                                setQuantity(product, product.quantity + 1);
                              }}
                            >
                              add
                            </i>
                          </Link>
                          <Link to="/">
                            <i
                              className="material-icons"
                              style={{ color: "#039be5" }}
                              onClick={() => {
                                product.quantity == 1
                                  ? removeFromCart(product)
                                  : setQuantity(product, product.quantity - 1);
                              }}
                            >
                              remove
                            </i>
                          </Link>
                        </div>
                      </Col>
                      <Col
                        className="cart-col col-center"
                        style={{ position: "absolute", left: "73%" }}
                      >
                        <b style={{ marginBottom: "5%", marginTop: "10%" }}>
                          Total: ${product.totalPrice}
                        </b>
                        <Link to="/">
                          <i
                            className="material-icons md-18"
                            style={{ color: "#039be5" }}
                            onClick={() => {
                              removeFromCart(product);
                            }}
                          >
                            delete
                          </i>
                        </Link>
                      </Col>
                    </Row>
                  </Container>
                </li>
              </ul>
            ))}
          </div>
          {cart.length > 0 ? (
            <div className="container" style={{width: '100%'}}>
              <div>
                <Row>
                  <li
                    style={{
                      textAlign: "right",
                      display: "grid",
                      padding: "2%",
                    }}
                  >
                    <h5>Total: ${getTotalSum()}</h5>
                  </li>

                  <div style={{ width: "30%", float: "right" }}>
                    <p style={{ textAlign: "center" }}>Saved Payment Methods</p>
                    <Select
                      defaultValue={paymentOptions[0] || "N/A"}
                      onChange={setSelectedPayment}
                      options={paymentOptions}
                      menuPortalTarget={document.body}
                      menuPosition={"fixed"}
                      isSearchable={false}
                    />{" "}
                  </div>
                </Row>
              </div>

              {!orderExecuting ? (
                <div
                  className="checkout"
                  style={{
                    display: "flex",
                    alignItems: "center",
                    flexDirection: "row-reverse",
                    marginBottom: "10%",
                  }}
                >
                  <div>
                    <button
                      className="waves-effect waves-light red btn"
                      style={{ margin: "1vh" }}
                      onClick={clearCart}
                    >
                      Clear Cart
                    </button>
                    <button
                      className="waves-effect waves-light green btn"
                      onClick={executeBuyNow}
                    >
                      Buy Now
                    </button>
                  </div>
                </div>
              ) : (
                <div style={{ float: "right", width: "30%" }}>
                  <h5 style={{ textAlign: "center" }}>Placing order...</h5>
                  <img
                    style={{ margin: "auto", display: "flex", width: "60%" }}
                    src="https://miro.medium.com/max/1080/0*DqHGYPBA-ANwsma2.gif"
                  />
                </div>
              )}
            </div>
          ) : (
            <h5 style={{ textAlign: "center", padding: "5%" }}>
              Cart is empty.
            </h5>
          )}
        </div>
      )}
    </>
  );
}
