function getDiscountPercentage(grade) {
  let discount;

  switch (grade) {
    case 10:
      discount = 5; // 5% discount for grade 10
      break;
    case 11:
      discount = 6;
      break;
    case 12:
      discount = 7;
      break;
    case 13:
      discount = 8;
      break;
    case 14:
      discount = 10;
      break;
    case 15:
      discount = 12;
      break;
    case 16:
      discount = 14;
      break;
    case 17:
      discount = 16;
      break;
    case 18:
      discount = 18;
      break;
    case 19:
      discount = 20;
      break;
    case 20:
      discount = 22;
      break;
    case 21:
      discount = 25;
      break;
    case 22:
      discount = 30; // 30% discount for grade 22
      break;
    default:
      discount = 0; // 0% discount for invalid or unlisted grades
      break;
  }

  return discount;
}

module.exports = getDiscountPercentage;
