import Sale from "../models/sale.model.js";

export const getSalesReport = async (req, res) => {
  try {
    const {
      customerName,
      salesman,
      counter,
      transportationType,
      category,
      productGroup,
      brand,
      product,
      location,
      saleType,
      saleMethod,
      dateFrom,
      dateTo
    } = req.body;

    const query = {};

    if (customerName) query.customerName = customerName;
    if (salesman) query.salesman = salesman;
    if (counter) query.counter = counter;
    if (transportationType) query.transportationType = transportationType;
    if (saleType) query.saleType = saleType;
    if (saleMethod) query.saleMethod = saleMethod;

    // Proper date range filtering
    if (dateFrom || dateTo) {
      query.saleDate = {};
      if (dateFrom) {
        query.saleDate.$gte = new Date(dateFrom);
      }
      if (dateTo) {
        query.saleDate.$lte = new Date(dateTo);
      }
    }

    // Debug: Log the query being sent to MongoDB
    console.log("MongoDB Query:", JSON.stringify(query, null, 2));

    const sales = await Sale.find(query)
      .populate({
        path: "products",
        match: {
          ...(product && { item: product }),
          ...(brand && { brand }),
          ...(category && { category }),
          ...(productGroup && { group: productGroup }),
          ...(location && { location })
        }
      })
      .lean();

    // Filter sales that have matching products (if filters were applied)
    const hasProductFilters = product || brand || category || productGroup || location;
    const filteredSales = sales.filter(s => 
      hasProductFilters ? s.products.length > 0 : true
    );

    res.status(200).json(filteredSales);

  } catch (err) {
    res.status(500).json({ message: "Error generating report", error: err.message });
  }
};


export const getSaleByInvoice = async (req, res) => {
  try {
    const { invoiceNumber } = req.params;

    if (!invoiceNumber)
      return res.status(400).json({ message: "Invoice number is required" });

    const sale = await Sale.findOne({ invoiceNumber })
      .populate("products")
      .lean();

    if (!sale)
      return res.status(404).json({ message: "Sale not found" });

    res.status(200).json(sale);
  } catch (err) {
    res.status(500).json({ message: "Error fetching sale", error: err.message });
  }
};