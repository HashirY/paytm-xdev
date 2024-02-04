const express = require("express");
const z = require("zod");
const { User, Account } = require("../db");
const jwt = require("jsonwebtoken");
const { JWT_SECRET } = require("../config");
const { authMiddleware } = require("../middleware");

const router = express.Router();

const signupBody = z.object({
  username: z.string().email(),
  firstName: z.string(),
  lastName: z.string(),
  password: z.string(),
});

const signinBody = z.object({
  username: z.string().email(),
  password: z.string(),
});

const updateBody = z.object({
  password: z.string().optional(),
  firstName: z.string().optional(),
  lastName: z.string().optional(),
});

router.post("/signup", async (req, res) => {
  const { success } = signupBody.safeParse(req.body);

  if (!success)
    return res.status(411).json({
      message: "Email already taken / Incorrect inputs",
    });

  const existingUser = await User.findOne({
    username: req.body.username,
  });

  if (existingUser)
    return res.status(411).json({
      message: "User already exists kindly login",
    });

  const user = await User.create({
    username: req.body.username,
    password: req.body.password,
    firstName: req.body.firstName,
    lastName: req.body.lastName,
  });

  const userId = user._id;

  await Account.create({
    userId,
    balance: 1 + Math.random() * 10000,
  });

  const token = jwt.sign(
    {
      userId,
    },
    JWT_SECRET
  );

  res.json({
    message: "User created successfully",
    token: token,
  });
});

// eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOiI2NWJmNTE5ZGYwNTU0YjVjYWVkNTY0YzAiLCJpYXQiOjE3MDcwMzc4NTB9.22UCemZMlKXigcn0-GS1yRQsSeQdmwNbLaY4ijpUO0Y

router.post("/signin", async (req, res) => {
  const { success } = signinBody.safeParse(req.body);

  if (!success)
    return res.status(411).json({
      message: "Email already taken / Incorrect inputs",
    });

  const user = await User.findOne({
    username: req.body.username,
    password: req.body.password,
  });

  if (user) {
    const token = jwt.sign(
      {
        userId: user._id,
      },
      JWT_SECRET
    );

    res.json({
      token: token,
    });

    return;
  }

  res.status(411).json({
    message: "Error while logging in",
  });
});

router.put("/", authMiddleware, async (req, res) => {
  const { success } = updateBody.safeParse(req.body);

  if (!success) {
    res.status(411).json({
      message: "Error while updating information",
    });
    return; // Added return statement to exit the function if validation fails
  }

  const userId = req.headers.userId;

  try {
    // Assuming req.body contains the fields to be updated
    const updateResult = await User.updateOne(
      { _id: userId },
      { $set: req.body }
    );

    if (updateResult.nModified === 0) {
      // If no documents were modified, it means the user with the provided ID was not found
      res.status(404).json({
        message: "User not found",
      });
      return;
    }

    res.json({
      message: "Updated successfully",
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      message: "Internal server error",
    });
  }
});

router.get("/bulk", async (req, res) => {
  const filter = req.query.filter || "";

  const users = await User.find({
    $or: [
      {
        firstName: {
          $regex: filter,
        },
      },
      {
        lastName: {
          $regex: filter,
        },
      },
    ],
  });

  res.json({
    user: users.map((user) => ({
      username: user.username,
      firstName: user.firstName,
      lastName: user.lastName,
      _id: user._id,
    })),
  });
});

module.exports = router;
