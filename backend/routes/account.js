const express = require("express");
const mongoose = require("mongoose");
const { authMiddleware } = require("../middleware");
const { Account } = require("../db");

const router = express.Router();

router.get("/balance", authMiddleware, async (req, res) => {
  const account = await Account.findOne({
    userId: req.headers.userId,
  });

  res.json({
    balance: account.balance,
  });
});

// id -> 65bf7a94431ef35d9a7651b5
// token -> eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOiI2NWJmN2E5NDQzMWVmMzVkOWE3NjUxYjUiLCJpYXQiOjE3MDcwNDc2MzR9.fdTTLXnaBwDNxxjVgvprXbdmyPyuTYIshCTf5Q7_Ea8

/*{
  "username":"hashir12",
  "password":"pass1",
  "firstName":"Hashir",
  "lastName":"Yameen"
}*/

router.post("/transfer", authMiddleware, async (req, res) => {
  const session = await mongoose.startSession();

  session.startTransaction();

  const { amount, to } = req.body;

  const account = await Account.findOne({ userId: req.headers.userId }).session(
    session
  );

  if (!account || account.balance < amount) {
    await session.abortTransaction();
    return res.status(400).json({
      message: "Insufficient balance",
    });
  }

  const toAccount = await Account.findOne({ userId: to }).session(session);

  if (!toAccount) {
    await session.abortTransaction();
    return res.status(400).json({
      message: "Invalid account",
    });
  }

  await Account.updateOne(
    { userId: req.headers.userId },
    { $inc: { balance: -amount } }
  ).session(session);

  await Account.updateOne(
    { userId: to },
    { $inc: { balance: amount } }
  ).session(session);

  await session.commitTransaction();

  res.json({
    message: "Transfer successfull",
  });
});

module.exports = router;
