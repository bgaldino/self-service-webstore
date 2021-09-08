import React, { useEffect, useState } from "react";
import useToken from "../useToken";
import { Col, Container, Row } from "react-bootstrap";
import moment from "moment";
import { Button, Dropdown } from "react-materialize";
import {
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
} from "@material-ui/core";
import DatePicker from "react-date-picker";
import io from "socket.io-client";
import loadingImg from "../../images/loading.gif";
import ownedImg from "../../images/owned.png";
import "./Assets.css";

const TERM_DEFINED = "TermDefined";
const ONE_TIME = "OneTime";
const EVERGREEN = "Evergreen";
const SELLING_MODEL_TYPES = {
  'OneTime': 'One Time',
  'Evergreen': 'Evergreen',
  'TermDefined': 'Term Defined'
}

const SOCKET_ENDPOINT = "https://self-service-webstore.herokuapp.com/";
const BASE_URL = `${process.env.REACT_APP_API_ENDPOINT}/services/data/v${process.env.REACT_APP_API_VERSION}`;

export default function Assets({ setCart, cart }) {
  const { token, setToken } = useToken();
  const [assets, setAssets] = useState([]);

  const [open, setOpen] = useState(false); // State of popup dialog
  const [selectedAsset, setSelectedAsset] = useState(null); // Asset data for popup

  const [date, onDateChange] = useState(new Date());

  const [loading, setLoading] = useState(true);
  const [events] = useState(new Map());

  // Create socket.io connection for streaming messages
  let socket = io(SOCKET_ENDPOINT, {
    transports: ["websocket", "polling", "flashsocket", "xhr-polling"],
  });

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

  // Execute the cancellation operation
  const handleCancel = async () => {
    let requestHeaders = new Headers();
    requestHeaders.append("X-Requested-With", "XMLHttpRequest");
    requestHeaders.append("Authorization", "Bearer " + token);
    requestHeaders.append("Content-Type", "application/json");
    date.setUTCHours(23, 59, 59, 0);
    let raw = JSON.stringify({
      assetIds: [selectedAsset.Id],
      cancellationDate: moment
        .utc(date, "MM-DD-YYYY")
        .add(1, "days")
        .format("YYYY-MM-DDTHH:mm:ss.SSS[Z]"),
      cancellationOutputType: 'Order',
    });

    let requestOptions = {
      method: "POST",
      headers: requestHeaders,
      body: raw,
      redirect: "follow",
    };

    // API call to initiate the cancellation flow
    await fetch(
      `${BASE_URL}/asset-management/assets/collection/actions/initiate-cancellation`,
      requestOptions
    )
      .then((response) => response.text())
      .then(async (result) => {
        let id = JSON.parse(result).requestId;
        let timer = setInterval(() => {
          if (events.has(id)) {
            clearInterval(timer);
            let message = events.get(id);
            if (message.payload.HasErrors) {
              alert("Error during cancellation. Please try again.");
	      console.log('Error event detail: ', message);
            } else {
              alert(
                `Cancellation order has been created for ${selectedAsset.Name}.`
              );
            }
            events.clear();
          }
        }, 2000);
      })
      .catch((error) => console.log("error", error));
    handleDialogClose();
  };

  // Reset values after the popup is closed for an item
  const handleDialogClose = () => {
    setOpen(false);
    setSelectedAsset(null);
  };

  async function fetchPricingData() {
    let pricingData = [];
    let requestHeaders = new Headers();
    let pricingMap = new Map();
    // Use token acquired at login
    requestHeaders.append("Authorization", "Bearer " + token);
    requestHeaders.append("Content-Type", "application/json");

    let requestOptions = {
      method: "GET",
      headers: requestHeaders,
      redirect: "follow",
    };

    // API call URL to fetch pricebook entries for correlating assets to product data
    let requestUrl = `${BASE_URL}/queryAll/?q=SELECT Id,Name,Product2Id, Product2.Name, ProductSellingModelId,ProductSellingModel.Name,ProductSellingModel.PricingTerm,ProductSellingModel.PricingTermUnit,ProductSellingModel.SellingModelType FROM PricebookEntry WHERE Pricebook2Id = '${`${process.env.REACT_APP_PRICEBOOK_ID}`}' AND IsActive = true AND CurrencyIsoCode = 'USD'`;
    await fetch(requestUrl, requestOptions)
      .then((response) => response.text())
      .then(async (result) => {
        pricingData = JSON.parse(result).records;
        // Create a map of product2 ids to pricebook entries
        let index = 0;
        for (index; index < pricingData.length; index++) {
          pricingMap.set(pricingData[index].Product2Id, pricingData[index]);
        }
      })
      .catch((error) => console.log("error", error));
    return pricingMap;
  }

  async function fetchAssetData() {
    let assetData = [];

    let requestHeaders = new Headers();

    // Use token acquired at login
    requestHeaders.append("Authorization", "Bearer " + token);
    requestHeaders.append("Content-Type", "application/json");

    let requestOptions = {
      method: "GET",
      headers: requestHeaders,
      redirect: "follow",
    };

    let assetList = [];

    // API call URL to get all assets
    let requestUrl = `${BASE_URL}/queryAll/?q=SELECT Id, Name, Price, Product2Id, PurchaseDate,CurrentQuantity,LifecycleStartDate, LifecycleEndDate FROM Asset WHERE CreatedById = '${localStorage.getItem("userid")}' ORDER BY LifecycleStartDate DESC`;
    await fetch(requestUrl, requestOptions)
      .then((response) => response.text())
      .then(async (result) => {
        assetData = JSON.parse(result).records;
        let pricingMap = await fetchPricingData();
        // Use the map to get selling model data for each asset
        let index = 0;
        const assetIds = [];
        for (index; index < assetData.length; index++) {
          let currentAsset = assetData[index];
          assetIds.push(currentAsset.Id);
          if (pricingMap.has(currentAsset.Product2Id)) {
            currentAsset.ProductSellingModel = pricingMap.get(
              currentAsset.Product2Id
            ).ProductSellingModel;
            currentAsset.Status = 'Active';
            currentAsset.Period = moment
                .utc(currentAsset.LifecycleStartDate)
                .format("MMM DD, YYYY")
                .toString() + ' - ';
            if (currentAsset.LifecycleEndDate) {
              currentAsset.Period += moment
                  .utc(currentAsset.LifecycleEndDate)
                  .format("MMM DD, YYYY")
                  .toString();
              if (currentAsset.ProductSellingModel.SellingModelType === 'Evergreen') {
                currentAsset.Status = 'Cancelled';
              }
            }
            currentAsset.SellingModelType = SELLING_MODEL_TYPES[currentAsset.ProductSellingModel.SellingModelType];
            assetList.push(currentAsset);
          }
        }
        console.log('All assets', assetList);
        if (assetIds.length > 0) {
          const bsgReqUrl = `${BASE_URL}/queryAll/?q=SELECT Id, ReferenceEntity.Id, EffectiveNextBillingDate, CurrentBillingPeriodAmount, TotalPendingAmount FROM BillingScheduleGroup WHERE ReferenceEntity.Id IN ('${assetIds.join('\', \'')}')`;
          await fetch(bsgReqUrl, requestOptions)
            .then((response) => response.text())
            .then(async (result) => {
              const bsgRecords = JSON.parse(result).records;
              bsgRecords.forEach(r => {
                const assetId = r.ReferenceEntity.Id;
                const asset = assetList.find(a => a.Id === assetId);
                if (asset) {
                  if (r.EffectiveNextBillingDate) {
                    asset.NextBillingDate = moment.utc(r.EffectiveNextBillingDate).format("MMM DD, YYYY").toString();
                  } else {
                    asset.NextBillingDate = 'N/A';
                  }
                }
              })
              console.log('got bsg result', bsgRecords);
            });
        }
      })
      .catch((error) => console.log("error", error));
    setAssets(assetList);
  }

  // Wait for API calls to finish before terminating loading
  async function populateData() {
    await fetchAssetData();
    setLoading(false);
  }

  useEffect(() => {
    socket.on("AssetEvent", (message) => {
      events.set(message.payload.RequestId, message);
    });
    populateData();
  }, [cart]);

  return (
    <div>
      {loading ? (
        <img style={{ margin: "auto", display: "flex" }} src={loadingImg} />
      ) : (
        <div className="container">
          <div className="page-header">
            <div style={{'padding-left': '1em'}}>
              <h5>What I Own</h5>
              See the list of your assets, and make changes to them.
            </div>
            <img className="header-image" src={ownedImg}/>
          </div>
          {assets.length === 0 ? (
            <h5 style={{ textAlign: "center" }}>No products found.</h5>
          ) : (
            <div>
              {assets.map((asset) => (
                <div>
                  <ul
                    className="collection"
                    style={{ width: "100%", margin: "auto" }}
                  >
                    <li className="collection-item" key={asset.Id}>
                      <Container style={{ width: "100%" }}>
                        <Row>
                          <Col style={{ width: "78%", marginLeft: "2%" }}>
                            <Row>
                              <div className="item-desc">
                                <h5 style={{ overflowWrap: "break-word" }}>
                                  {asset.Name}
                                  <span className={asset.Status == 'Active' ? 'new green badge' : 'new red badge'}
                                        data-badge-caption="">
                                  {asset.Status}
                                </span>
                                </h5>
                              </div>
                            </Row>
                            <Row>
                              <p>
                                {asset.CurrentQuantity && (
                                  <span>
                                    {asset.CurrentQuantity} user
                                    {asset.CurrentQuantity > 1 && <span>s</span>}
                                    {" | "}
                                  </span>
                                )}
                                {asset.SellingModelType}{" | "}
                                {asset.ProductSellingModel.SellingModelType && (
                                  <span>
                                    {asset.ProductSellingModel
                                      .SellingModelType == TERM_DEFINED && (
                                      <span>
                                        Term:{" "}
                                        {asset.ProductSellingModel.PricingTerm}{" "}
                                        {asset.ProductSellingModel.PricingTermUnit.toLowerCase()}{" "}
                                        {" | "}
                                      </span>
                                    )}
                                    {asset.ProductSellingModel
                                      .SellingModelType == EVERGREEN && (
                                      <span>
                                        Billing{" "}
                                        {convertUnitTerm(
                                          asset.ProductSellingModel
                                            .PricingTermUnit
                                        )}
                                      </span>
                                    )}{" "}
                                  </span>
                                )}
                              </p>
                            </Row>
                            <Row>
                              <Col>
                                {asset.NextBillingDate && (
                                    <span>
                                      <div>Next Billing Date:</div>
                                      <strong>{asset.NextBillingDate}</strong>
                                  </span>
                                )}
                              </Col>
                              <Col>
                                {asset.Period && (
                                  <span>
                                    <div>Period:</div>
                                    <strong>{asset.Period}</strong>
                                  </span>
                                )}
                              </Col>
                            </Row>
                          </Col>
                          <Col style={{ width: "20%" }}>
                            <h6
                              style={{ marginTop: "50%", textAlign: "center" }}
                            >
                              {asset.Price && (
                                <span>
                                  ${asset.Price}
                                  {asset.ProductSellingModel.SellingModelType !=
                                    ONE_TIME && (
                                    <span>
                                      {" "}
                                      {convertUnitTerm(
                                        asset.ProductSellingModel
                                          .PricingTermUnit
                                      )}
                                    </span>
                                  )}{" "}
                                </span>
                              )}
                            </h6>
                          </Col>

                          <Col style={{ width: "10%" }}>
                            <Dropdown
                              id={"dd" + asset.Id}
                              options={{
                                alignment: "right",
                                autoTrigger: true,
                                closeOnClick: true,
                                constrainWidth: true,
                                container: null,
                                coverTrigger: true,
                                hover: false,
                                inDuration: 150,
                                onCloseEnd: null,
                                onCloseStart: null,
                                onOpenEnd: null,
                                onOpenStart: null,
                                outDuration: 250,
                              }}
                              trigger={
                                <Button
                                  style={{
                                    position: "absolute",
                                    top: "10%",
                                    right: "5%",
                                    backgroundColor: "#13334C",
                                  }}
                                  id={"db" + asset.Id}
                                  node="button"
                                >
                                  Options
                                </Button>
                              }
                            >
                              <a href="#">Amend</a>
                              {asset.LifecycleEndDate != null && (
                                <a href="#">Renew</a>
                              )}
                              {asset.LifecycleEndDate == null && (
                                <a
                                  onClick={() => {
                                    setSelectedAsset(asset);
                                    setOpen(true);
                                  }}
                                >
                                  Cancel
                                </a>
                              )}
                            </Dropdown>
                          </Col>
                        </Row>
                      </Container>
                    </li>
                  </ul>
                  <br />
                </div>
              ))}
              {/* Control the content of the dialog based on which product has been selected */}
              {selectedAsset ? (
                <Dialog
                  open={open}
                  onClose={handleDialogClose}
                  aria-labelledby="alert-dialog-title"
                  aria-describedby="alert-dialog-description"
                  fullWidth
                  maxWidth="sm"
                >
                  <DialogTitle id="alert-dialog-title">
                    Cancel {selectedAsset.Name}
                  </DialogTitle>
                  <DialogContent style={{ height: "40vh" }}>
                    <p>
                      Cancellation date:{" "}
                      <DatePicker
                        minDate={new Date()}
                        onChange={onDateChange}
                        value={date}
                      />
                    </p>
                  </DialogContent>
                  <DialogActions>
                    <Button onClick={handleCancel} color="primary">
                      Cancel subscription
                    </Button>
                  </DialogActions>
                </Dialog>
              ) : (
                ""
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
