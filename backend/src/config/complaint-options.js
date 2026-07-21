const DEPARTMENTS = [
  "Ministry Headquarters",
  "Family Support & Gender Affairs",
  "Human Services",
  "Community Rehabilitation",
  "Policy & Planning",
  "Inspector of Social Services Institutions",
];

const DISTRICTS = [
  "Belize",
  "Cayo",
  "Corozal",
  "Orange Walk",
  "Stann Creek",
  "Toledo",
];

const PRIORITIES = ["Low", "Medium", "High", "Critical"];

const STATUSES = [
  "New",
  "Under Review",
  "In Progress",
  "Pending Information",
  "Resolved",
  "Closed",
  "Rejected",
  "Duplicate",
  "Returned",
];

const CATEGORY_BY_DEPARTMENT = {
  "Ministry Headquarters": [
    "General Service Concern",
    "Office Access",
    "Staff Conduct",
    "Other",
  ],
  "Family Support & Gender Affairs": [
    "Family Support Services",
    "Gender-Based Violence Support",
    "Economic Empowerment",
    "Disability Desk",
    "Elderly Care",
    "Other",
  ],
  "Human Services": [
    "Child Protection Services",
    "Child Placement & Specialized Services",
    "Alternative Care",
    "Parenting Support",
    "Child Care Centers",
    "Other",
  ],
  "Community Rehabilitation": [
    "Community Counselling Center",
    "Court & Case Management",
    "Youth Development",
    "Criminal Records",
    "Other",
  ],
  "Policy & Planning": [
    "Policy Feedback",
    "Data Request",
    "Programme Coordination",
    "Other",
  ],
  "Inspector of Social Services Institutions": [
    "Facility Concern",
    "Standards / Compliance",
    "Inspection Request",
    "Other",
  ],
};

const isValidDepartment = (department) => DEPARTMENTS.includes(department);

const isValidCategory = (department, category) =>
  Boolean(CATEGORY_BY_DEPARTMENT[department]?.includes(category));

module.exports = {
  CATEGORY_BY_DEPARTMENT,
  DEPARTMENTS,
  DISTRICTS,
  PRIORITIES,
  STATUSES,
  isValidCategory,
  isValidDepartment,
};
