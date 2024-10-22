function getGradeToDiscount(grade) {
  let totalCap;

  switch (grade) {
    case 1:
      totalCap = 5000; // 5% totalCap for grade 10
      break;
    case 2:
      totalCap = 10000;
      break;
    case 3:
      totalCap = 20000;
      break;
    case 4:
      totalCap = 30000;
      break;
    case 5:
      totalCap = 40000;
      break;
    case 6:
      totalCap = 50000;
      break;
    default:
      totalCap = 0; // 0% totalCap for invalid or unlisted grades
      break;
  }

  return totalCap;
}

module.exports = getGradeToDiscount;
