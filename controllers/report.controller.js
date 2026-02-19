import Sale from "../models/sale.model.js";
import { Purchase } from "../models/purchase.model.js";
import { Stock } from "../models/stock.model.js";

// ─────────────────────────────────────────────────────────────────────────────
// HELPER: build a date range filter
// ─────────────────────────────────────────────────────────────────────────────
const buildDateRange = (from, to, field = "createdAt") => {
  if (!from && !to) return {};
  const range = {};
  if (from) range.$gte = new Date(from);
  if (to)   range.$lte = new Date(to);
  return { [field]: range };
};

// ─────────────────────────────────────────────────────────────────────────────
// 1. SALES REPORT
//    Fields accepted: invoiceNumber, customerName, salesman, saleMethod,
//                     saleType, transportationType, customerType, saleStatus,
//                     HSCode, companyName, itemDescription, location,
//                     dateFrom, dateTo
// ─────────────────────────────────────────────────────────────────────────────
export const getSalesReport = async (req, res) => {
  try {
    const userId = req.user?._id || req.userId;
    if (!userId) return res.status(401).json({ message: "Unauthorized" });

    const {
      invoiceNumber,
      customerName,
      salesman,
      saleMethod,
      saleType,
      transportationType,
      customerType,
      saleStatus,
      HSCode,
      companyName,
      itemDescription,
      location,
      dateFrom,
      dateTo,
    } = req.body;

    // ── Top-level (Sale document) filters ─────────────────────────────────────
    const query = { userId };

    if (invoiceNumber !== undefined && invoiceNumber !== "")
      query.invoiceNumber = Number(invoiceNumber);

    if (customerName)      query.customerName      = { $regex: customerName, $options: "i" };
    if (salesman)          query.salesman          = { $regex: salesman,     $options: "i" };
    if (saleMethod)        query.saleMethod        = saleMethod;
    if (saleType)          query.saleType          = saleType;
    if (transportationType) query.transportationType = transportationType;
    if (customerType)      query.customerType      = customerType;
    if (saleStatus)        query.saleStatus        = saleStatus;

    Object.assign(query, buildDateRange(dateFrom, dateTo, "saleDate"));

    // ── Embedded products[] filters ───────────────────────────────────────────
    const productFilters = {};
    if (HSCode)           productFilters["products.HSCode"]           = { $regex: HSCode,          $options: "i" };
    if (companyName)      productFilters["products.companyName"]      = { $regex: companyName,     $options: "i" };
    if (itemDescription)  productFilters["products.itemDescription"]  = { $regex: itemDescription, $options: "i" };
    if (location)         productFilters["products.location"]         = { $regex: location,        $options: "i" };

    const hasProductFilters = Object.keys(productFilters).length > 0;
    if (hasProductFilters) Object.assign(query, productFilters);

    const sales = await Sale.find(query).lean();

    // ── Flatten / clean output ────────────────────────────────────────────────
    const result = sales.map(({ _id, userId, __v, ...sale }) => ({
      id: _id,
      ...sale,
      // spread totals & paymentDetails inline so the response isn't deeply nested
      ...(sale.totals         || {}),
      ...(sale.paymentDetails || {}),
      totals:         undefined,
      paymentDetails: undefined,
    }));

    return res.status(200).json({ count: result.length, data: result });
  } catch (err) {
    console.error("getSalesReport:", err);
    return res.status(500).json({ message: "Error generating sales report", error: err.message });
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// 2. PURCHASE REPORT
//    Fields accepted: invoiceNumber, sellerName, NTN_CNIC, purchaseMethod,
//                     purchaseStatus, paymentStatus, HSCode, companyName,
//                     itemDescription, location, dateFrom, dateTo
// ─────────────────────────────────────────────────────────────────────────────
//export const getPurchasesReport = async (req, res) => {
//  try {
//    const userId = req.user?._id || req.userId;
//    if (!userId) return res.status(401).json({ message: "Unauthorized" });

//    const {
//      invoiceNumber,
//      sellerName,
//      NTN_CNIC,
//      purchaseMethod,
//      purchaseStatus,
//      paymentStatus,
//      HSCode,
//      companyName,
//      itemDescription,
//      location,
//      dateFrom,
//      dateTo,
//    } = req.body;

//    const query = { userId };

//    if (invoiceNumber)    query.invoiceNumber   = { $regex: invoiceNumber, $options: "i" };
//    if (sellerName)       query.sellerName      = { $regex: sellerName,    $options: "i" };
//    if (NTN_CNIC)         query.NTN_CNIC        = { $regex: NTN_CNIC,      $options: "i" };
//    if (purchaseMethod)   query.purchaseMethod  = purchaseMethod;
//    if (purchaseStatus)   query.purchaseStatus  = purchaseStatus;
//    if (paymentStatus)    query.paymentStatus   = paymentStatus;
//    if (HSCode)           query.HSCode          = { $regex: HSCode,        $options: "i" };
//    if (companyName)      query.companyName     = { $regex: companyName,   $options: "i" };
//    if (itemDescription)  query.itemDescription = { $regex: itemDescription, $options: "i" };
//    if (location)         query.location        = { $regex: location,      $options: "i" };

//    Object.assign(query, buildDateRange(dateFrom, dateTo, "purchaseDate"));

//    const purchases = await Purchase.find(query).lean();

//    // ── Flatten items[] inline ────────────────────────────────────────────────
//    // If item-level filters were applied, further filter items inside each doc
//    const hasItemFilter = itemDescription || location;

//    const result = purchases.map(({ _id, userId, __v, items, ...doc }) => {
//      let filteredItems = items || [];

//      if (hasItemFilter) {
//        filteredItems = filteredItems.filter((item) => {
//          const descMatch = itemDescription
//            ? new RegExp(itemDescription, "i").test(item.itemDescription)
//            : true;
//          const locMatch = location
//            ? new RegExp(location, "i").test(item.location)
//            : true;
//          return descMatch && locMatch;
//        });
//      }

//      return {
//        id: _id,
//        ...doc,
//        items: filteredItems,
//      };
//    });

//    // Drop docs that had item filters but nothing survived the filter
//    const final = hasItemFilter
//      ? result.filter((r) => r.items.length > 0)
//      : result;

//    return res.status(200).json({ count: final.length, data: final });
//  } catch (err) {
//    console.error("getPurchasesReport:", err);
//    return res.status(500).json({ message: "Error generating purchases report", error: err.message });
//  }
//};

//export const getPurchasesReport = async (req, res) => {
//  try {
//    console.log("[REPORT] Incoming getPurchasesReport request");

//    const userId = req.user?._id || req.userId;
//    if (!userId) {
//      console.warn("[REPORT] Unauthorized access attempt");
//      return res.status(401).json({ message: "Unauthorized" });
//    }

//    console.log("[REPORT] User:", userId.toString());

//    const {
//      invoiceNumber,
//      sellerName,
//      NTN_CNIC,
//      purchaseMethod,
//      purchaseStatus,
//      paymentStatus,
//      HSCode,
//      companyName,
//      itemDescription,
//      location,
//      dateFrom,
//      dateTo,
//    } = req.body;

//    const query = { userId };

//    if (invoiceNumber)   query.invoiceNumber  = { $regex: invoiceNumber, $options: "i" };
//    if (sellerName)      query.sellerName     = { $regex: sellerName, $options: "i" };
//    if (NTN_CNIC)        query.NTN_CNIC       = { $regex: NTN_CNIC, $options: "i" };
//    if (purchaseMethod) query.purchaseMethod = purchaseMethod;
//    if (purchaseStatus) query.purchaseStatus = purchaseStatus;
//    if (paymentStatus)  query.paymentStatus  = paymentStatus;
//    if (HSCode)         query.HSCode          = { $regex: HSCode, $options: "i" };
//    if (companyName)    query.companyName     = { $regex: companyName, $options: "i" };
//    if (itemDescription)query.itemDescription= { $regex: itemDescription, $options: "i" };
//    if (location)       query.location        = { $regex: location, $options: "i" };

//    Object.assign(query, buildDateRange(dateFrom, dateTo, "purchaseDate"));

//    console.log("[REPORT] Mongo Query:", JSON.stringify(query));

//    const purchases = await Purchase.find(query).lean();
//    console.log("[REPORT] Purchases fetched:", purchases.length);

//    const hasItemFilter = Boolean(itemDescription || location);
//    console.log("[REPORT] Item-level filter active:", hasItemFilter);

//    const result = purchases.map(({ _id, userId, __v, items, ...doc }) => {
//      let filteredItems = items || [];

//      if (hasItemFilter) {
//        const before = filteredItems.length;

//        filteredItems = filteredItems.filter((item) => {
//          const descMatch = itemDescription
//            ? new RegExp(itemDescription, "i").test(item.itemDescription)
//            : true;
//          const locMatch = location
//            ? new RegExp(location, "i").test(item.location)
//            : true;
//          return descMatch && locMatch;
//        });

//        console.log(
//          `[REPORT] Purchase ${_id}: items ${before} → ${filteredItems.length}`
//        );
//      }

//      return {
//        id: _id,
//        ...doc,
//        items: filteredItems,
//      };
//    });

//    const final = hasItemFilter
//      ? result.filter((r) => r.items.length > 0)
//      : result;

//    console.log("[REPORT] Final result count:", final.length);

//    return res.status(200).json({ count: final.length, data: final });
//  } catch (err) {
//    console.error("[REPORT] Fatal error:", err);
//    return res.status(500).json({
//      message: "Error generating purchases report",
//      error: err.message,
//    });
//  }
//};

export const getPurchasesReport = async (req, res) => {
  try {
    const userId = req.user?._id || req.userId;
    if (!userId) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    const {
      invoiceNumber,
      sellerName,
      NTN_CNIC,
      purchaseMethod,
      purchaseStatus,
      paymentStatus,
      HSCode,
      companyName,
      itemDescription,
      location,
      dateFrom,
      dateTo,
    } = req.body;

    const query = { userId };

    if (invoiceNumber)
      query.invoiceNumber = { $regex: invoiceNumber, $options: "i" };

    if (sellerName)
      query.sellerName = { $regex: sellerName, $options: "i" };

    if (NTN_CNIC)
      query.NTN_CNIC = { $regex: NTN_CNIC, $options: "i" };

    if (purchaseMethod)
      query.purchaseMethod = purchaseMethod;

    if (purchaseStatus)
      query.purchaseStatus = purchaseStatus;

    if (paymentStatus)
      query.paymentStatus = paymentStatus;

    if (HSCode)
      query.HSCode = { $regex: HSCode, $options: "i" };

    if (companyName)
      query.companyName = { $regex: companyName, $options: "i" };

    if (itemDescription)
      query.itemDescription = { $regex: itemDescription, $options: "i" };

    if (location)
      query.location = { $regex: location, $options: "i" };

    Object.assign(query, buildDateRange(dateFrom, dateTo, "purchaseDate"));

    const purchases = await Purchase.find(query).lean();

    const result = purchases.map(({ _id, __v, ...doc }) => ({
      id: _id,
      ...doc,
    }));

    return res.status(200).json({
      count: result.length,
      data: result,
    });
  } catch (err) {
    console.error("getPurchasesReport:", err);
    return res.status(500).json({
      message: "Error generating purchases report",
      error: err.message,
    });
  }
};


// ─────────────────────────────────────────────────────────────────────────────
// 3. STOCK REPORT
//    Fields accepted: HSCode, companyName, itemDescription, location,
//                     branchId, dateFrom, dateTo
// ─────────────────────────────────────────────────────────────────────────────
export const getStockReport = async (req, res) => {
  try {
    const userId = req.user?._id || req.userId;
    if (!userId) return res.status(401).json({ message: "Unauthorized" });

    const {
      HSCode,
      companyName,
      itemDescription,
      location,
      branchId,
      dateFrom,
      dateTo,
    } = req.body;

    const query = { userId };

    if (HSCode)       query.HSCode       = { $regex: HSCode,       $options: "i" };
    if (companyName)  query.companyName  = { $regex: companyName,  $options: "i" };
    if (branchId)     query.branchId     = branchId;

    Object.assign(query, buildDateRange(dateFrom, dateTo, "createdAt"));

    // item-level filters → use $elemMatch so Mongo pre-filters at DB level
    if (itemDescription || location) {
      const elemMatch = {};
      if (itemDescription) elemMatch.itemDescription = { $regex: itemDescription, $options: "i" };
      if (location)        elemMatch.location        = { $regex: location,        $options: "i" };
      query.items = { $elemMatch: elemMatch };
    }

    const stocks = await Stock.find(query).lean();

    // ── Flatten items[] ───────────────────────────────────────────────────────
    // Return one row per stock item (unnested) for easy table rendering
    const result = [];

    for (const { _id, userId, __v, items, ...stock } of stocks) {
      let filteredItems = items || [];

      if (itemDescription || location) {
        filteredItems = filteredItems.filter((item) => {
          const descMatch = itemDescription
            ? new RegExp(itemDescription, "i").test(item.itemDescription)
            : true;
          const locMatch = location
            ? new RegExp(location, "i").test(item.location)
            : true;
          return descMatch && locMatch;
        });
      }

      for (const item of filteredItems) {
        // Flatten purchaseDetails into individual rows if needed,
        // but keep them as an array to avoid exploding row count
        const { purchaseDetails, ...itemFields } = item;

        result.push({
          stockId: _id,
          HSCode:      stock.HSCode,
          companyName: stock.companyName,
          branchId:    stock.branchId,
          createdAt:   stock.createdAt,
          updatedAt:   stock.updatedAt,
          ...itemFields,
          // Keep purchaseDetails nested — flattening each purchase would
          // multiply rows unnecessarily; caller can drill in per stockId+item
          purchaseDetails: purchaseDetails || [],
        });
      }
    }

    return res.status(200).json({ count: result.length, data: result });
  } catch (err) {
    console.error("getStockReport:", err);
    return res.status(500).json({ message: "Error generating stock report", error: err.message });
  }
};