let unclaimedCards = [];
let totalFromAPI = 1;
let userInfo = null;
let walletInfo = null;

// Inject "Claim All" Button And Message Area
var intervalId = window.setInterval(function () {
  // els = document.getElementsByClassName("style_collectiblesAmount__f4HNL");
  els = document.getElementsByClassName("style_tabsContainer__3l1uy");
  button = document.getElementById("injected-button");
  console.log("Attempting to inject bulk claim button");
  if (els && els.length > 0 && button == null) {
    el = els[1];
    newEl = document.createElement("div");
    newEl.innerHTML =
      "<button onclick='claimCards()' class='style_button__1aALc style_primary__3twLZ'><span>Claim All</span></button>";
    newEl.id = "injected-button";
    //Create message box
    newEl2 = document.createElement("ul");
    newEl2.id = "message-area";

    if (el) {
      el.lastChild.after(newEl);
      newEl.after(newEl2);
      console.log("Bulk claim button injected!");
      clearInterval(intervalId);
    }
  }
}, 500);

function addRawHtmlToMessageArea(html) {
  messageArea = document.getElementById("message-area");
  messageArea.innerHTML += html;
}

function addUserMessage(message, color = "grey") {
  addRawHtmlToMessageArea(
    '<li style="list-style-type: none; color:' +
      color +
      '">' +
      String(message) +
      "</li>"
  );
  console.log("log: " + String(message));
}

function claimCards() {
  addRawHtmlToMessageArea("<br/>");
  document.getElementById("injected-button").firstChild.disabled = true;
  getUserInfo();
}

function getUserInfo() {
  // Get user ID
  addUserMessage("GETTING USER, WALLET AND CARD DETAILS", "white");
  addUserMessage("Fetching user info ...");
  fetch("https://api-wallet.mint.store/authentication", {
    method: "POST",
    headers: {"Content-Type": "application/json"},
    mode: "cors",
    referrerPolicy: "strict-origin-when-cross-origin",
    body: JSON.stringify({
      strategy: "jwt",
      accessToken: localStorage["feathers-jwt"],
    }),
  })
    .then(r => r.text())
    .then(result => {
      const userInfoResult = JSON.parse(result);
      // console.log(userInfoResult);
      userInfo = userInfoResult.user;
      getWalletInfo();
    });
}

function getWalletInfo() {
  addUserMessage("Fetching wallet info ...");
  const url =
    "https://api-wallet.mint.store/flow-client-wallet?walletType=Dapper&userId=" +
    String(userInfo.id);
  const headers = {
    "If-Modified-Since": "Wed, 19 Oct 2015 10:50:00 GMT",
    Authorization: "Bearer " + localStorage["feathers-jwt"],
  };
  fetch(url, {headers})
    .then(r => r.text())
    .then(result => {
      const walletInfoResult = JSON.parse(result);
      console.log(walletInfoResult);
      walletInfo = walletInfoResult.data;
      if (walletInfo.length == 0) {
        addUserMessage(
          "ERROR: You must connect a wallet to your account before claiming!"
        );
        document.getElementById("injected-button").firstChild.disabled = false;
      } else {
        addUserMessage(
          "Found a Dapper wallet with address of " + walletInfo[0].address
        );
        getUnclaimedCards();
      }
    });
}

async function getUnclaimedCards() {
  addUserMessage("Fetching unclaimed cards ...");

  let skip = 0;

  while (unclaimedCards.length < totalFromAPI) {
    await get50Cards(skip);
    skip += 50;
  }

  await new Promise(resolve => setTimeout(resolve, 1000)); //delay the UI until next paint

  if (unclaimedCards.length > 0) {
    promptUserAndClaimAll();
  } else {
    addUserMessage("NO UNCLAIMED CARDS FOUND!", "orange");
    document.getElementById("injected-button").firstChild.disabled = false;
  }
}

async function get50Cards(skip) {
  const baseUrl = "https://api-wallet.mint.store";
  const urlParams =
    "purchased-nft?$skip=" +
    skip +
    "&$limit=50&merchantFID%5B0%5D=79&mintingStatus%5B%24or%5D%5B0%5D=MINTED&mintingStatus%5B%24or%5D%5B1%5D=PURCHASED&mintingStatus%5B%24or%5D%5B2%5D=CLAIM_PROCESSING&mintingStatus%5B%24or%5D%5B3%5D=CLAIM_PROCESSING_ERROR";
  const url = baseUrl + "/" + urlParams;
  const headers = {
    "If-Modified-Since": "Wed, 19 Oct 2015 10:50:00 GMT",
    Authorization: "Bearer " + localStorage["feathers-jwt"],
  };
  await fetch(url, {headers})
    .then(r => r.text())
    .then(result => {
      const obj = JSON.parse(result);
      unclaimedCards = unclaimedCards.concat(obj.data);
      totalFromAPI = obj.total;
      addUserMessage(
        "Found " +
          String(obj.data.length) +
          (unclaimedCards.length > 50 ? " more" : "") +
          " unclaimed cards"
      );
    });
}

async function claimCard(card, timeoutSec) {
  addUserMessage("CLAIMING CARD: '" + card.name + "' ...", "white");
  console.log(card);
  const headers_ = {
    Authorization: "Bearer " + localStorage["feathers-jwt"],
    Accept: "application/json",
    "Content-Type": "application/json",
  };

  fetch("https://prod.api.mint.store/claim-nft", {
    method: "POST",
    mode: "cors",
    headers: headers_,
    referrerPolicy: "strict-origin-when-cross-origin",

    body: JSON.stringify({
      flowAddress: walletInfo[0].address,
      purchasedNftId: card["id"],
    }),
  }).then(function (response) {
    console.log("Claim card response received");
    console.log(response);
  });
  addUserMessage(
    "Waiting " + timeoutSec + " seconds before claiming next card ..."
  );
  await new Promise((resolve, reject) =>
    setTimeout(resolve, timeoutSec * 1000)
  );
}

async function promptUserAndClaimAll() {
  // Prompt User To Confirm
  let confirmed = confirm(
    "Found " +
      String(unclaimedCards.length) +
      " unclaimed cards.  Would you like to claim all of these?"
  );
  if (confirmed) {
    addUserMessage(
      "ATTEMPTING TO CLAIM CARDS.  DO NOT REFRESH OR NAVAGATE AWAY FROM THIS PAGE UNTIL COMPLETE!",
      "orange"
    );
    for (let i = 0; i < unclaimedCards.length; i++) {
      addUserMessage(
        "Card " + String(i + 1) + " out of " + String(unclaimedCards.length)
      );
      let card = unclaimedCards[i];
      console.log(card);
      await claimCard(card, 10);
    }
    addUserMessage(
      "CLAIMING REQUESTS COMPLETE!  PLEASE ALLOW FOR A FEW MINUTES FOR ALL CLAIMING TO COMPLETE",
      "#31c131"
    );
  } else {
    addUserMessage("CLAIMING CANCELLED!", "#db0000");
    document.getElementById("injected-button").firstChild.disabled = false;
  }
}
