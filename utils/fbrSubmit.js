import { submitInvoice } from './fbr-sandbox.js';
import { decrypt } from './crypto.js';
import SaleModel from '../models/sale.model.js';

export const submitToFBR = async (sale, user) => {
  const token = decrypt(user.productionToken);

  const payload = {
    invoiceType        : 'Sale Invoice',
    invoiceDate        : sale.saleDate.toISOString().split('T')[0],
    invoiceRefNo       : String(sale.invoiceNumber),
    sellerNTNCNIC      : user.sellerNTNCNIC,
    sellerBusinessName : user.companyName,
    sellerProvince     : user.sellerProvince,
    sellerAddress      : user.address,
    buyerNTNCNIC       : sale.ntn || sale.cnic,
    buyerBusinessName  : sale.customerName,
    buyerProvince      : 'Sindh',           // extend later if needed
    buyerAddress       : '',
    buyerRegistrationType: sale.fbrBuyerRegistrationType,
    items: sale.products.map((p, i) => ({
      hsCode                         : p.HSCode,
      productDescription             : p.itemDescription,
      rate                           : `${p.gstRate}%`,
      uoM                            : p.fbr?.uoM ?? 'Numbers, pieces, units',
      quantity                       : p.qty,
      valueSalesExcludingST          : p.amount,
      fixedNotifiedValueOrRetailPrice: p.fbr?.fixedNotifiedValueOrRetailPrice ?? 0,
      salesTaxApplicable             : p.gstAmount,
      salesTaxWithheldAtSource       : p.fbr?.salesTaxWithheldAtSource ?? 0,
      extraTax                       : p.fbr?.extraTax ?? 0,
      furtherTax                     : p.fbr?.furtherTax ?? 0,
      sroScheduleNo                  : p.fbr?.sroScheduleNo ?? '',
      fedPayable                     : p.fbr?.fedPayable ?? 0,
      discount                       : p.discount,
      totalValues                    : p.netAmount,
      saleType                       : p.fbr?.fbrSaleType,
      sroItemSerialNo                 : p.fbr?.sroItemSerialNo ?? '',
    })),
  };

  const result    = await submitInvoice(token, payload);
  const fbrStatus = result.data?.validationResponse?.statusCode;
  const passed    = fbrStatus === '00';

  await SaleModel.findByIdAndUpdate(sale._id, {
    fbrInvoiceNo  : passed ? result.data.invoiceNumber : null,
    fbrStatus     : passed ? 'submitted' : 'failed',
    fbrSubmittedAt: new Date(),
  });
};