import React, { useState, useEffect } from "react";
import Button from "@material-ui/core/Button";
import Dialog from "@material-ui/core/Dialog";
import DialogActions from "@material-ui/core/DialogActions";
import DialogContent from "@material-ui/core/DialogContent";
import DialogContentText from "@material-ui/core/DialogContentText";
import DialogTitle from "@material-ui/core/DialogTitle";
import Snackbar from "@material-ui/core/Snackbar";

import MuiAlert from "@material-ui/lab/Alert";

import useToken from "./useToken";
import analytics from "../images/demoAnalytics.png";
import smartbytes from "../images/smartbytes.png"
import ownedImg from "../images/owned.png";

const TERM_DEFINED = "TermDefined";
const ONE_TIME = "OneTime";
const EVERGREEN = "Evergreen";

export default function Home({ setCart, cart }) {
  const [open, setOpen] = useState(false); // State of popup dialog
  const [selectedProduct, setSelectedProduct] = useState(null); // Product data for popup
  const [selectedQuantity, setSelectedQuantity] = useState(1); // Quantity to use for popup

  const [snackbarOpen, setSnackbarOpen] = useState(false); // Add to cart confirmation snackbar
  const [products, setProducts] = useState([]); // Array of all products
  const { token, setToken } = useToken(); // Auth token
  const [loading, setLoading] = useState(true);

  const [searchTerm, setSearchTerm] = React.useState(); // Real time user input
  const [currentSearch, setCurrentSearch] = React.useState(); // Saved search term after user hits submit

  // Updates whenever there is a change to the search box
  const handleSearchChange = (e) => {
    setSearchTerm(e.target.value);
  };

  // Handler for the search button being clicked
  async function handleSearchSubmit() {
    setLoading(true);
    setCurrentSearch(searchTerm);
    await populateProductData(); // Refetch product data
  }

  // Used to handle a change in quantity for adding an item to the cart
  const handleQuantityChange = (e) => {
    const quantity = e.target.validity.valid
      ? e.target.value
      : selectedQuantity;
    setSelectedQuantity(quantity);
  };

  // Confirmation after items have been added to the cart
  function Alert(props) {
    return <MuiAlert elevation={6} variant="filled" {...props} />;
  }

  // Used to get all active pricebook entries for an org
  async function fetchPricebookEntryData() {
    let pbeData = [];
    let requestHeaders = new Headers();

    // Use the token acquired at login
    requestHeaders.append("Authorization", "Bearer " + token);
    requestHeaders.append("Content-Type", "application/json");

    let requestOptions = {
      method: "GET",
      headers: requestHeaders,
      redirect: "follow",
    };

    let requestUrl = `${process.env.REACT_APP_API_ENDPOINT}/services/data/v${
      process.env.REACT_APP_API_VERSION
    }/queryAll/?q=SELECT CurrencyIsoCode,Id,IsActive,Name,Pricebook2Id,Product2Id,Product2.DisplayUrl,Product2.Description, ProductSellingModelId,ProductSellingModel.Name,ProductSellingModel.PricingTerm,ProductSellingModel.PricingTermUnit,ProductSellingModel.SellingModelType FROM PricebookEntry WHERE Pricebook2Id = '${`${process.env.REACT_APP_PRICEBOOK_ID}`}' AND IsActive = true AND CurrencyIsoCode = 'USD'`;

    // If the user has searched for something, add it to the request URL
    if (searchTerm) {
      requestUrl += ` AND Name LIKE '${searchTerm}%25'`;
    }

    await fetch(requestUrl, requestOptions)
      .then((response) => response.text())
      .then(async (result) => {
        pbeData = JSON.parse(result).records;
        await populatePrices(pbeData, requestHeaders);
      })
      .catch((error) => console.log("error", error));
  }

  // Creates the request body for the pricing engine API using all pricebook entries
  function constructPricingBody(data) {
    // Initial body
    let raw = {
      listPricebookId: `${process.env.REACT_APP_PRICEBOOK_ID}`,
      candidatePricebookIds: [`${process.env.REACT_APP_PRICEBOOK_ID}`],
      pricingFlow: "GET_CATALOG_PRICE",
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

    // Go through pricebook entries and construct a body for each one
    let index = 1;
    for (index; index <= data.length; index++) {
      let pbe = data[index - 1];

      // Additional data processing to add necessary fields to the pbe
      pbe.sellingModel = pbe.ProductSellingModel.SellingModelType;
      pbe.pricingTermUnit = pbe.ProductSellingModel.PricingTermUnit;
      pbe.pricingTerm = parseInt(pbe.ProductSellingModel.PricingTerm);
      pbe.description = pbe.Product2.Description;
      pbe.img = pbe.Product2.DisplayUrl;

      // Create an entry for 1 of each product
      let entry = {
        referenceId: "ref_sales_txn_item" + index,
        record: {
          attributes: {
            type: "SalesTransactionItem",
          },
          CurrencyIsoCode: "USD",
          SalesTransactionId: "@{ref_sales_txn.Id}",
          ProductId: pbe.Product2Id,
          Quantity: "1.0",
          ProductSellingModelId: pbe.ProductSellingModelId,
        },
      };
      raw.graph.records.push(entry);
    }
    return JSON.stringify(raw);
  }

  // Calls the pricing engine API using the request body constructed from pricebook entry data
  async function populatePrices(data, requestHeaders) {
    let pricedProducts = [];
    // Get the full request body to be used for the API call
    let requestBody = constructPricingBody(data);

    let requestOptions = {
      method: "POST",
      headers: requestHeaders,
      body: requestBody,
      redirect: "follow",
    };

    await fetch(
      `${process.env.REACT_APP_API_ENDPOINT}/services/data/v${process.env.REACT_APP_API_VERSION}/commerce/pricing/salestransaction/actions/calculate-price`,
      requestOptions
    )
      .then((response) => response.text())
      .then((result) => {
        let pricingData = JSON.parse(result);
        let index = 1;
        for (index; index <= data.length; index++) {
          let pbe = data[index - 1];
          // Get the ListPrice value and round it to two decimal places
          let price = pricingData.records[index].record.ListPrice;
          pbe.price = (Math.round(price * 100) / 100).toFixed(2);
          pricedProducts.push(pbe);
        }
      })
      .catch((error) => console.log("error", error));
    setProducts(pricedProducts); // Set the products array after the prices of the products are set
  }

  // Waits for API calls to finish and product data to populate before terminating loading
  async function populateProductData() {
    await fetchPricebookEntryData();
    setLoading(false);
  }

  useEffect(() => {
    populateProductData();
    localStorage.setItem("cart", JSON.stringify(cart)); // Saves state of cart
  }, [cart]);

  // Reset values after the popup is closed for an item
  const handleDialogClose = () => {
    setOpen(false);
    setSelectedProduct(null);
    setSelectedQuantity(1);
  };

  const handleSnackbarOpen = () => {
    setSnackbarOpen(true);
  };

  const handleSnackbarClose = (event, reason) => {
    if (reason === "clickaway") {
      return;
    }
    setSnackbarOpen(false);
  };

  // Used to facilitate adding items to the cart from the homepage
  const addToCart = () => {
    let newCart = [...cart];
    let quantToAdd = parseInt(selectedQuantity);
    // Check if the item already exists in the cart
    let itemInCart = newCart.find((item) => selectedProduct.Name === item.Name);
    if (itemInCart) {
      itemInCart.quantity += quantToAdd; // Update quantity if already present
    } else {
      // Otherwise create a new item and add to the cart
      itemInCart = {
        ...selectedProduct,
        quantity: quantToAdd,
      };
      newCart.push(itemInCart);
    }
    setCart(newCart);
    handleDialogClose();
    handleSnackbarOpen();
  };

  // Used to swap wording for pricing term units
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

  // Maps all the products to cards
  let itemList = products.map((product) => {
    return (
      <div className="card" key={product.Id}>
        <div className="card-border"></div>
        {product.img && (
          <div className="card-image">
            <img src={product.img} alt={product.title} />
          </div>
        )}
        <span
          to="/"
          className="btn-floating halfway-fab waves-effect waves-light green"
          style={{ right: "14px", bottom: "10px" }}
          onClick={() => {
            setSelectedProduct(product);
            setOpen(true);
          }}
        >
          <i className="material-icons">add</i>
        </span>

        <div className="card-content">
          <span className="card-title">{product.Name}</span>

          <div>
            <i>{product.description}</i>
            <br />
            <br />
            <p>
              <h6>
                {/* Render the price based on the term - ex. Evergreen is $13 monthly, Term defined is $2 for 12 months */}
                <b>
                  ${product.price}{" "}
                  {product.sellingModel == EVERGREEN &&
                    convertUnitTerm(product.pricingTermUnit)}{" "}
                  {product.sellingModel === TERM_DEFINED && (
                    <span>
                      for {product.pricingTerm}{" "}
                      {product.pricingTermUnit.toLowerCase()}
                    </span>
                  )}
                </b>
              </h6>
            </p>
            <br />
            <br />
          </div>
          {/* Control the content of the dialog based on which product has been selected */}
          {selectedProduct ? (
            <Dialog
              open={open}
              onClose={handleDialogClose}
              aria-labelledby="alert-dialog-title"
              aria-describedby="alert-dialog-description"
            >
              <DialogTitle id="alert-dialog-title">
                {selectedProduct.Name}
              </DialogTitle>
              <DialogContent>
                <DialogContentText style={{ color: "black" }}>
                  Price: ${selectedProduct.price}{" "}
                  {selectedProduct.sellingModel != ONE_TIME &&
                    convertUnitTerm(selectedProduct.pricingTermUnit)}{" "}
                </DialogContentText>
                <DialogContentText style={{ color: "black" }}>
                  {selectedProduct.sellingModel == TERM_DEFINED && (
                    <div>
                      <p>
                        Term: {selectedProduct.pricingTerm}{" "}
                        {selectedProduct.pricingTermUnit.toLowerCase()}
                      </p>
                    </div>
                  )}{" "}
                </DialogContentText>
              </DialogContent>
              <DialogContent>
                <DialogContentText style={{ color: "black" }}>
                  Quantity:
                  <input
                    style={{ width: "35%", textAlign: "center" }}
                    type="text"
                    pattern="[1-9][0-9]*"
                    onInput={handleQuantityChange}
                    value={selectedQuantity}
                  />
                </DialogContentText>
              </DialogContent>
              <DialogActions>
                <Button onClick={handleDialogClose} color="primary">
                  Cancel
                </Button>
                <Button onClick={addToCart} color="primary" autoFocus>
                  Add to cart
                </Button>
              </DialogActions>
            </Dialog>
          ) : (
            ""
          )}
          <Snackbar
            open={snackbarOpen}
            autoHideDuration={6000}
            onClose={handleSnackbarClose}
          >
            <Alert onClose={handleSnackbarClose} severity="success">
              Item added to cart!
            </Alert>
          </Snackbar>
        </div>
      </div>
    );
  });

  return (
    <div className="container">
      <div className="page-header">
        <div style={{'padding-left': '1em'}}><h5>Store</h5>Hello {localStorage.getItem('userName')}, welcome to SmartBytes web store.</div>
        <img className="header-image" src={smartbytes}/>
      </div>
      <h5 className="center" style={{ marginTop: "3%" }}>
        Products
      </h5>
      <div style={{ margin: "auto", width: "35%" }}>
        <input
          type="text"
          placeholder="Search for a product"
          value={searchTerm}
          onChange={handleSearchChange}
        />
        <button
          style={{
            position: "absolute",
            color: "white",
            backgroundColor: "#13334C",
            marginLeft: "1vw",
          }}
          type="button"
          className="btn btn-default"
          onClick={handleSearchSubmit}
        >
          Search
        </button>
      </div>
      {!currentSearch ? (
        <h6 style={{ textAlign: "center" }}>Showing all results</h6>
      ) : (
        <h5 style={{ textAlign: "center" }}>
          Showing results for "{currentSearch}"
        </h5>
      )}
      {!loading ? (
        <div>
          {products.length === 0 ? (
            <h5 style={{ textAlign: "center" }}>No products found.</h5>
          ) : (
            <div
              className="box"
              style={{
                marginTop: "4vh",
                justifyContent: "space-evenly",
                marginBottom: "10vh",
              }}
            >
              {itemList}
            </div>
          )}
        </div>
      ) : (
        <img
          style={{ margin: "auto", display: "flex" }}
          src="https://miro.medium.com/max/1080/0*DqHGYPBA-ANwsma2.gif"
        />
      )}
    </div>
  );
}
