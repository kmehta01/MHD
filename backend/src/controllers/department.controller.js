const DepartmentModel = require("../models/department.model");

const getDepartments = async (req, res) => {
  try {
    const departments = await DepartmentModel.findActive();

    return res.json({
      status: true,
      message: "Departments fetched successfully",
      data: departments,
    });
  } catch (error) {
    return res.status(500).json({
      status: false,
      message: "Failed to fetch departments",
      error: process.env.NODE_ENV === "development" ? error.message : undefined,
    });
  }
};

module.exports = {
  getDepartments,
};
