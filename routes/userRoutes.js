const express = require("express");
const router = express.Router();
const validate = require("../middlewares/validate");
const protect = require("../middlewares/protect");
const restrictTo = require("../middlewares/restrictTo");

const {
  createUser,
  getAllUsers,
  getUserById,
  getMe,
  updateUser,
  deleteUser,
} = require("../controllers/userController");

const {
  createUserSchema,
  updateUserSchema,
  userParams,
} = require("../validations/user.validation");

router.use(protect);

// "/me" must be declared before "/:id" or Express matches it as an id
// and the controller tries findById("me").
router.get("/me", getMe);

router.post(
  "/",
  restrictTo("admin"),
  validate({ body: createUserSchema }),
  createUser,
);
router.get("/", restrictTo("admin"), getAllUsers);
router.get(
  "/:id",
  restrictTo("admin"),
  validate({ params: userParams }),
  getUserById,
);

// Not restrictTo: a user may edit themselves, an admin may edit anyone.
// That is ownership, not a role, so the check lives in the controller.
router.put(
  "/:id",
  validate({ params: userParams, body: updateUserSchema }),
  updateUser,
);
router.delete(
  "/:id",
  restrictTo("admin"),
  validate({ params: userParams }),
  deleteUser,
);

router.get("/me", getMe);
router.patch("/me/avatar", uploadAvatar, updateMyAvatar);
router.delete("/me/avatar", removeMyAvatar);

module.exports = router;
