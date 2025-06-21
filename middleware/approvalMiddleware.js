// middleware/approvalMiddleware.js

exports.isApprovedUser = (req, res, next) => {
  if (req.user && req.user.approval_status === 'approved') {
    return next();
  } else {
    return res.status(403).json({
      msg: 'Your account is pending approval by the admin. Please wait.',
    });
  }
};
