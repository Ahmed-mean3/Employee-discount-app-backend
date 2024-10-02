function checkEmailValidity(email) {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

  // Check for presence of '@' symbol
  if (!email.includes("@")) {
    return {
      status: false,
      message: "Email is missing '@' symbol.",
    };
  }

  // Check if there's at least one character before '@'
  const parts = email.split("@");
  if (parts[0].length === 0) {
    return {
      status: false,
      message: "Email must contain characters before '@'.",
    };
  }

  // Check if there's a domain part after '@'
  if (parts[1].length === 0) {
    return {
      status: false,
      message: "Email must contain characters after '@'.",
    };
  }

  // Check if there's a '.' in the domain part
  if (!parts[1].includes(".")) {
    return {
      status: false,
      message: "Email must contain a '.' in the domain part.",
    };
  }

  // Ensure there's at least one character after the '.'
  const domainParts = parts[1].split(".");
  if (domainParts[domainParts.length - 1].length === 0) {
    return {
      status: false,
      message: "Email must contain characters after the '.'.",
    };
  }

  // Check if the email is valid
  if (!emailRegex.test(email)) {
    return {
      status: false,
      message: "Email format is invalid.",
    };
  }

  return {
    status: true,
    message: "Email is valid.",
  };
}

module.exports = checkEmailValidity;
