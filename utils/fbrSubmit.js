//import { submitInvoice } from './fbr-sandbox.js';
//import { decrypt } from './crypto.js';
//import SaleModel from '../models/sale.model.js';

//export const submitToFBR = async (sale, user) => {
//  const token = decrypt(user.productionToken);

//  const payload = {
//    invoiceType        : 'Sale Invoice',
//    invoiceDate        : sale.saleDate.toISOString().split('T')[0],
//    invoiceRefNo       : String(sale.invoiceNumber),
//    sellerNTNCNIC      : user.sellerNTNCNIC,
//    sellerBusinessName : user.companyName,
//    sellerProvince     : user.sellerProvince,
//    sellerAddress      : user.address,
//    buyerNTNCNIC       : sale.cnicOrNtn,
//    buyerBusinessName  : sale.customerName,
//    buyerProvince      : 'Sindh',           // extend later if needed
//    buyerAddress       : sale.companyAddress,
//    buyerRegistrationType: sale.fbrBuyerRegistrationType,
//    items: sale.products.map((p, i) => ({
//  hsCode                         : p.HSCode,
//  productDescription             : p.itemDescription,
//  rate                           : `${p.gstRate}%`,
//  uoM                            : p.fbr?.uoM ?? 'Numbers, pieces, units',
//  quantity                       : parseFloat(p.qty.toFixed(4)),
//  valueSalesExcludingST          : parseFloat(p.amount.toFixed(2)),
//  fixedNotifiedValueOrRetailPrice: parseFloat((p.fbr?.fixedNotifiedValueOrRetailPrice ?? 0).toFixed(2)),
//  salesTaxApplicable             : parseFloat(p.gstAmount.toFixed(2)),
//  salesTaxWithheldAtSource       : parseFloat((p.fbr?.salesTaxWithheldAtSource ?? 0).toFixed(2)),
//  extraTax                       : parseFloat((p.fbr?.extraTax ?? 0).toFixed(2)),
//  furtherTax                     : parseFloat((p.fbr?.furtherTax ?? 0).toFixed(2)),
//  sroScheduleNo                  : p.fbr?.sroScheduleNo ?? '',
//  fedPayable                     : parseFloat((p.fbr?.fedPayable ?? 0).toFixed(2)),
//  discount                       : parseFloat((p.discount ?? 0).toFixed(2)),
//  totalValues                    : parseFloat(p.netAmount.toFixed(2)),
//  saleType                       : p.fbr?.fbrSaleType,
//  sroItemSerialNo                : p.fbr?.sroItemSerialNo ?? '',
//})),
//  };

//  const result    = await submitInvoice(token, payload);
//  const fbrStatus = result.data?.validationResponse?.statusCode;
//  const passed    = fbrStatus === '00';

//  await SaleModel.findByIdAndUpdate(sale._id, {
//    fbrInvoiceNo  : passed ? result.data.invoiceNumber : null,
//    fbrStatus     : passed ? 'submitted' : 'failed',
//    fbrSubmittedAt: new Date(),
//  });
//};

import { submitInvoice } from './fbr-sandbox.js';
import { decrypt } from './crypto.js';
import SaleModel from '../models/sale.model.js';

export const submitToFBR = async (sale, user) => {
  try {
    console.log('[FBR] Starting submission...');
    console.log('[FBR] Sale ID:', sale._id);

    const token = decrypt(user.productionToken);
    console.log('[FBR] Token decrypted successfully');

    const payload = {
      invoiceType: 'Sale Invoice',
      invoiceDate: sale.saleDate.toISOString().split('T')[0],
      invoiceRefNo: String(sale.invoiceNumber),
      sellerNTNCNIC: user.sellerNTNCNIC,
      sellerBusinessName: user.companyName,
      sellerProvince: user.sellerProvince,
      sellerAddress: user.address,
      buyerNTNCNIC: sale.cnicOrNtn,
      buyerBusinessName: sale.customerName,
      buyerProvince: 'Sindh',
      buyerAddress: sale.companyAddress,
      buyerRegistrationType: sale.fbrBuyerRegistrationType,
      items: sale.products.map((p, i) => ({
        hsCode: p.HSCode,
        productDescription: p.itemDescription,
        rate: `${p.gstRate}%`,
        uoM: p.fbr?.uoM ?? 'Numbers, pieces, units',
        quantity: parseFloat(p.qty.toFixed(4)),
        valueSalesExcludingST: parseFloat(p.amount.toFixed(2)),
        fixedNotifiedValueOrRetailPrice: parseFloat((p.fbr?.fixedNotifiedValueOrRetailPrice ?? 0).toFixed(2)),
        salesTaxApplicable: parseFloat(p.gstAmount.toFixed(2)),
        salesTaxWithheldAtSource: parseFloat((p.fbr?.salesTaxWithheldAtSource ?? 0).toFixed(2)),
        extraTax: parseFloat((p.fbr?.extraTax ?? 0).toFixed(2)),
        furtherTax: parseFloat((p.fbr?.furtherTax ?? 0).toFixed(2)),
        sroScheduleNo: p.fbr?.sroScheduleNo ?? '',
        fedPayable: parseFloat((p.fbr?.fedPayable ?? 0).toFixed(2)),
        discount: parseFloat((p.discount ?? 0).toFixed(2)),
        totalValues: parseFloat(p.netAmount.toFixed(2)),
        saleType: p.fbr?.fbrSaleType,
        sroItemSerialNo: p.fbr?.sroItemSerialNo ?? '',
      })),
    };

    console.log('[FBR] Payload ready:', JSON.stringify(payload, null, 2));

    console.log('[FBR] Submitting invoice...');
    const result = await submitInvoice(token, payload);

    console.log('[FBR] Raw response:', JSON.stringify(result?.data, null, 2));

    const fbrStatus = result.data?.validationResponse?.statusCode;
    const passed = fbrStatus === '00';

    console.log('[FBR] Status code:', fbrStatus);
    console.log('[FBR] Passed:', passed);

    await SaleModel.findByIdAndUpdate(sale._id, {
      fbrInvoiceNo: passed ? result.data.invoiceNumber : null,
      fbrStatus: passed ? 'submitted' : 'failed',
      fbrSubmittedAt: new Date(),
    });

    console.log('[FBR] DB updated successfully');

  } catch (error) {
    console.error('[FBR] ❌ Submission failed');
    console.error('[FBR] Error message:', error.message);
    console.error('[FBR] Stack trace:', error.stack);

    if (error.response) {
      console.error('[FBR] API Response Error:', error.response.data);
    }

    await SaleModel.findByIdAndUpdate(sale._id, {
      fbrStatus: 'failed',
      fbrSubmittedAt: new Date(),
    });
  }
};