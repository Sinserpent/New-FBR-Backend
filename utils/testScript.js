import { submitToFBR } from "./fbrSubmit.js";
import  userModel  from "../models/userModel.js";

const testFBRSubmission = async () => {
  const user = await userModel.findById("69c6ccd0dc2c35012d476934");

  const mockSale = {
    _id: new mongoose.Types.ObjectId(),
    userId: user._id,
    invoiceNumber: 999999,
    branchId: new mongoose.Types.ObjectId(),
    saleMethod: "cash",
    customerType: "walking",
    transportationType: "pickup",
    saleType: "retail",
    saleStatus: "confirm",
    saleDate: new Date(),
    customerName: "Test Customer",
    products: [
      {
        HSCode: "0101.2100",
        companyName: "Test Company",
        itemDescription: "Test Item",
        qty: 1,
        rate: 1,
        amount: 1,
        gstRate: 0,
        gstAmount: 0,
        discount: 0,
        netAmount: 1,
        fbr: {
          uoM: "Numbers, pieces, units",
          fbrSaleType: "Retail",
          sroScheduleNo: "",
          sroItemSerialNo: "",
          fixedNotifiedValueOrRetailPrice: 0,
          extraTax: 0,
          furtherTax: 0,
          fedPayable: 0,
          salesTaxWithheldAtSource: 0,
        }
      }
    ],
    totals: {
      totalQuantity: 1,
      totalAmount: 1,
      totalGstAmount: 0,
      totalDiscount: 0,
      totalNetAmount: 1,
    },
    paymentDetails: {
      totalNetAmount: 1,
      amountReceived: 1,
      remainingAmount: 0,
      changeAmount: 0,
      paymentStatus: "Fully Paid",
    },
    // stub out the save so submitToFBR can update fbrStatus etc.
    save: async () => {},
  };

  await submitToFBR(mockSale, user);
};

testFBRSubmission().catch(console.error);