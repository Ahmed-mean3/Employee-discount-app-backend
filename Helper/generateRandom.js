const handleRandomCodeGenerate = () => {
  const length = 10; // Length of the random part
  const characters = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789"; // Allowed characters for the random part

  // Generate the random part
  let randomPart = "";
  for (let i = 0; i < length; i++) {
    const randomIndex = Math.floor(Math.random() * characters.length);
    randomPart += characters[randomIndex];
  }

  // Create the final discount code
  return `${randomPart}`;
};

module.exports = handleRandomCodeGenerate;
