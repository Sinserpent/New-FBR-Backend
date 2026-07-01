import express from 'express';
import { submitInvoice, FbrError } from '../utils/fbr-sandbox.js';
import user from "../models/userModel.js"
import userAuth from '../middleware/userAuth.js';

const router = express.Router();

// ─── All 28 scenario payloads (exact verified JSONs from FBR docs) ────────────

const ALL_SCENARIOS = {

  SN001: {
    description: 'Goods at Standard Rate to Registered Buyers',
    payload: {
      invoiceType           : 'Sale Invoice',
      buyerNTNCNIC          : '2046004',
      buyerBusinessName     : 'FERTILIZER MANUFAC IRS NEW',
      buyerProvince         : 'Sindh',
      buyerAddress          : 'Karachi',
      buyerRegistrationType : 'Registered',
      invoiceRefNo          : '',
      items: [{
        hsCode                         : '0101.2100',
        productDescription             : 'test',
        rate                           : '18%',
        uoM                            : 'Numbers, pieces, units',
        quantity                       : 400,
        totalValues                    : 0,
        valueSalesExcludingST          : 1000,
        fixedNotifiedValueOrRetailPrice: 0,
        salesTaxApplicable             : 180,
        salesTaxWithheldAtSource       : 0,
        extraTax                       : '',
        furtherTax                     : 0,
        sroScheduleNo                  : '',
        fedPayable                     : 0,
        discount                       : 0,
        saleType                       : 'Goods at standard rate (default)',
        sroItemSerialNo                : '',
      }],
    },
  },

  SN002: {
    description: 'Goods at Standard Rate to Unregistered Buyers',
    payload: {
      invoiceType           : 'Sale Invoice',
      buyerNTNCNIC          : '1234567',
      buyerBusinessName     : 'FERTILIZER MANUFAC IRS NEW',
      buyerProvince         : 'Sindh',
      buyerAddress          : 'Karachi',
      buyerRegistrationType : 'Unregistered',
      invoiceRefNo          : '',
      items: [{
        hsCode                         : '0101.2100',
        productDescription             : 'test',
        rate                           : '18%',
        uoM                            : 'Numbers, pieces, units',
        quantity                       : 400,
        totalValues                    : 0,
        valueSalesExcludingST          : 1000,
        fixedNotifiedValueOrRetailPrice: 0,
        salesTaxApplicable             : 180,
        salesTaxWithheldAtSource       : 0,
        extraTax                       : '',
        furtherTax                     : 0,
        sroScheduleNo                  : '',
        fedPayable                     : 0,
        discount                       : 0,
        saleType                       : 'Goods at standard rate (default)',
        sroItemSerialNo                : '',
      }],
    },
  },

  SN003: {
    description: 'Sale of Steel (Melted and Re-Rolled)',
    payload: {
      invoiceType           : 'Sale Invoice',
      buyerNTNCNIC          : '3710505701479',
      buyerBusinessName     : 'FERTILIZER MANUFAC IRS NEW',
      buyerProvince         : 'Sindh',
      buyerAddress          : 'Karachi',
      buyerRegistrationType : 'Unregistered',
      invoiceRefNo          : '0',
      items: [{
        hsCode                         : '7214.1010',
        productDescription             : '',
        rate                           : '18%',
        uoM                            : 'MT',
        quantity                       : 1,
        totalValues                    : 0,
        valueSalesExcludingST          : 205000,
        fixedNotifiedValueOrRetailPrice: 0,
        salesTaxApplicable             : 36900,
        salesTaxWithheldAtSource       : 0,
        extraTax                       : 0,
        furtherTax                     : 0,
        sroScheduleNo                  : '',
        fedPayable                     : 0,
        discount                       : 0,
        saleType                       : 'Steel melting and re-rolling',
        sroItemSerialNo                : '',
      }],
    },
  },

  SN004: {
    description: 'Sale of Steel Scrap by Ship Breakers',
    payload: {
      invoiceType  : 'Sale Invoice',
      buyerNTNCNIC : '3710505701479',
      buyerBusinessName: 'FERTILIZER MANUFAC IRS NEW',
      buyerProvince: 'Sindh',
      buyerAddress : 'Karachi',
      invoiceRefNo : 'SI-20250421-001',
      items: [{
        hsCode                         : '7204.1010',
        productDescription             : '',
        rate                           : '18%',
        uoM                            : 'MT',
        quantity                       : 1,
        totalValues                    : 0,
        valueSalesExcludingST          : 175000,
        fixedNotifiedValueOrRetailPrice: 0,
        salesTaxApplicable             : 31500,
        salesTaxWithheldAtSource       : 0,
        extraTax                       : 0,
        furtherTax                     : 0,
        sroScheduleNo                  : '',
        fedPayable                     : 0,
        discount                       : 0,
        saleType                       : 'Ship breaking',
        sroItemSerialNo                : '',
      }],
    },
  },

  SN005: {
    description: 'Reduced Rate Sale (Eighth Schedule)',
    payload: {
      invoiceType           : 'Sale Invoice',
      buyerNTNCNIC          : '1000000000000',
      buyerBusinessName     : 'FERTILIZER MANUFAC IRS NEW',
      buyerProvince         : 'Sindh',
      buyerAddress          : 'Karachi',
      buyerRegistrationType : 'Unregistered',
      invoiceRefNo          : '',
      items: [{
        hsCode                         : '0102.2930',
        productDescription             : 'product Description41',
        rate                           : '1%',
        uoM                            : 'Numbers, pieces, units',
        quantity                       : 1,
        totalValues                    : 0,
        valueSalesExcludingST          : 1000,
        fixedNotifiedValueOrRetailPrice: 0,
        salesTaxApplicable             : 10,
        salesTaxWithheldAtSource       : 50.23,
        extraTax                       : '',
        furtherTax                     : 120,
        sroScheduleNo                  : 'EIGHTH SCHEDULE Table 1',
        fedPayable                     : 50.36,
        discount                       : 56.36,
        saleType                       : 'Goods at Reduced Rate',
        sroItemSerialNo                : '82',
      }],
    },
  },

  SN006: {
    description: 'Exempt Goods Sale (Sixth Schedule)',
    payload: {
      invoiceType           : 'Sale Invoice',
      buyerNTNCNIC          : '2046004',
      buyerBusinessName     : 'FERTILIZER MANUFAC IRS NEW',
      buyerProvince         : 'Sindh',
      buyerAddress          : 'Karachi',
      buyerRegistrationType : 'Registered',
      invoiceRefNo          : 'SI-20250515-001',
      items: [{
        hsCode                         : '0102.2930',
        productDescription             : 'product Description41',
        rate                           : 'Exempt',
        uoM                            : 'Numbers, pieces, units',
        quantity                       : 1,
        totalValues                    : 0,
        valueSalesExcludingST          : 10,
        fixedNotifiedValueOrRetailPrice: 0,
        salesTaxApplicable             : 0,
        salesTaxWithheldAtSource       : 50.23,
        extraTax                       : '',
        furtherTax                     : 120,
        sroScheduleNo                  : '6th Schd Table I',
        fedPayable                     : 50.36,
        discount                       : 56.36,
        saleType                       : 'Exempt goods',
        sroItemSerialNo                : '100',
      }],
    },
  },

  SN007: {
    description: 'Zero Rated Sale',
    payload: {
      invoiceType           : 'Sale Invoice',
      buyerNTNCNIC          : '3710505701479',
      buyerBusinessName     : 'FERTILIZER MANUFAC IRS NEW',
      buyerProvince         : 'Sindh',
      buyerAddress          : 'Karachi',
      buyerRegistrationType : 'Unregistered',
      invoiceRefNo          : '0',
      items: [{
        hsCode                         : '0101.2100',
        productDescription             : 'test',
        rate                           : '0%',
        uoM                            : 'Numbers, pieces, units',
        quantity                       : 100,
        totalValues                    : 0,
        valueSalesExcludingST          : 100,
        fixedNotifiedValueOrRetailPrice: 0,
        salesTaxApplicable             : 0,
        salesTaxWithheldAtSource       : 0,
        extraTax                       : 0,
        furtherTax                     : 0,
        sroScheduleNo                  : '327(I)/2008',
        fedPayable                     : 0,
        discount                       : 0,
        saleType                       : 'Goods at zero-rate',
        sroItemSerialNo                : '1',
      }],
    },
  },

  SN008: {
    description: 'Third Schedule Goods (Fixed/Notified Value)',
    payload: {
      invoiceType           : 'Sale Invoice',
      buyerNTNCNIC          : '3710505701479',
      buyerBusinessName     : 'FERTILIZER MANUFAC IRS NEW',
      buyerProvince         : 'Sindh',
      buyerAddress          : 'Karachi',
      buyerRegistrationType : 'Unregistered',
      invoiceRefNo          : '0',
      items: [{
        hsCode                         : '0101.2100',
        productDescription             : 'test',
        rate                           : '18%',
        uoM                            : 'Numbers, pieces, units',
        quantity                       : 100,
        totalValues                    : 145,
        valueSalesExcludingST          : 0.01,
        fixedNotifiedValueOrRetailPrice: 1000,
        salesTaxApplicable             : 180,
        salesTaxWithheldAtSource       : 0,
        extraTax                       : '',
        furtherTax                     : 0,
        sroScheduleNo                  : '',
        fedPayable                     : 0,
        discount                       : 0,
        saleType                       : '3rd Schedule Goods',
        sroItemSerialNo                : '',
      }],
    },
  },

  SN009: {
    description: 'Cotton Ginners',
    payload: {
      invoiceType           : 'Sale Invoice',
      buyerNTNCNIC          : '2046004',
      buyerBusinessName     : 'FERTILIZER MANUFAC IRS NEW',
      buyerProvince         : 'Sindh',
      buyerAddress          : 'Karachi',
      buyerRegistrationType : 'Registered',
      invoiceRefNo          : '',
      items: [{
        hsCode                         : '0101.2100',
        productDescription             : 'test',
        rate                           : '18%',
        uoM                            : 'Numbers, pieces, units',
        quantity                       : 0,
        totalValues                    : 2500,
        valueSalesExcludingST          : 2500,
        fixedNotifiedValueOrRetailPrice: 0,
        salesTaxApplicable             : 450,
        salesTaxWithheldAtSource       : 0,
        extraTax                       : 0,
        furtherTax                     : 0,
        sroScheduleNo                  : '',
        fedPayable                     : 0,
        discount                       : 0,
        saleType                       : 'Cotton ginners',
        sroItemSerialNo                : '',
      }],
    },
  },

  SN010: {
    description: 'Telecommunication Services',
    payload: {
      invoiceType           : 'Sale Invoice',
      buyerNTNCNIC          : '1000000000000',
      buyerBusinessName     : 'FERTILIZER MANUFAC IRS NEW',
      buyerProvince         : 'Sindh',
      buyerAddress          : 'Karachi',
      buyerRegistrationType : 'Unregistered',
      invoiceRefNo          : 'SI-20250515-001',
      items: [{
        hsCode                         : '0101.2100',
        productDescription             : 'test',
        rate                           : '17%',
        uoM                            : 'Numbers, pieces, units',
        quantity                       : 1000,
        totalValues                    : 0,
        valueSalesExcludingST          : 100,
        fixedNotifiedValueOrRetailPrice: 0,
        salesTaxApplicable             : 17,
        salesTaxWithheldAtSource       : 0,
        extraTax                       : 0,
        furtherTax                     : 0,
        sroScheduleNo                  : '',
        fedPayable                     : 0,
        discount                       : 0,
        saleType                       : 'Telecommunication services',
        sroItemSerialNo                : '',
      }],
    },
  },

  SN011: {
    description: 'Toll Manufacturing',
    payload: {
      invoiceType  : 'Sale Invoice',
      buyerNTNCNIC : '3710505701479',
      buyerBusinessName: 'FERTILIZER MANUFAC IRS NEW',
      buyerProvince: 'Sindh',
      buyerAddress : 'Karachi',
      invoiceRefNo : '',
      items: [{
        hsCode                         : '7214.9990',
        productDescription             : '',
        rate                           : '18%',
        uoM                            : 'MT',
        quantity                       : 1,
        totalValues                    : 205000,
        valueSalesExcludingST          : 205000,
        fixedNotifiedValueOrRetailPrice: 0,
        salesTaxApplicable             : 36900,
        salesTaxWithheldAtSource       : 0,
        extraTax                       : 0,
        furtherTax                     : 0,
        sroScheduleNo                  : '',
        fedPayable                     : 0,
        discount                       : 0,
        saleType                       : 'Toll Manufacturing',
        sroItemSerialNo                : '',
      }],
    },
  },

  SN012: {
    description: 'Petroleum Products',
    payload: {
      invoiceType           : 'Sale Invoice',
      buyerNTNCNIC          : '1000000000000',
      buyerBusinessName     : 'FERTILIZER MANUFAC IRS NEW',
      buyerProvince         : 'Sindh',
      buyerAddress          : 'Karachi',
      buyerRegistrationType : 'Unregistered',
      invoiceRefNo          : 'SI-20250515-001',
      items: [{
        hsCode                         : '0101.2100',
        productDescription             : 'TEST',
        rate                           : '1.43%',
        uoM                            : 'Numbers, pieces, units',
        quantity                       : 123,
        totalValues                    : 132,
        valueSalesExcludingST          : 100,
        fixedNotifiedValueOrRetailPrice: 0,
        salesTaxApplicable             : 1.43,
        salesTaxWithheldAtSource       : 2,
        extraTax                       : 0,
        furtherTax                     : 0,
        sroScheduleNo                  : '1450(I)/2021',
        fedPayable                     : 0,
        discount                       : 0,
        saleType                       : 'Petroleum Products',
        sroItemSerialNo                : '4',
      }],
    },
  },

  SN013: {
    description: 'Electricity Supply to Retailers',
    payload: {
      invoiceType           : 'Sale Invoice',
      buyerNTNCNIC          : '1000000000000',
      buyerBusinessName     : 'FERTILIZER MANUFAC IRS NEW',
      buyerProvince         : 'Sindh',
      buyerAddress          : 'Karachi',
      buyerRegistrationType : 'Unregistered',
      invoiceRefNo          : 'SI-20250515-001',
      items: [{
        hsCode                         : '0101.2100',
        productDescription             : 'TEST',
        rate                           : '5%',
        uoM                            : 'Numbers, pieces, units',
        quantity                       : 123,
        totalValues                    : 212,
        valueSalesExcludingST          : 1000,
        fixedNotifiedValueOrRetailPrice: 0,
        salesTaxApplicable             : 50,
        salesTaxWithheldAtSource       : 11,
        extraTax                       : 0,
        furtherTax                     : 0,
        sroScheduleNo                  : '1450(I)/2021',
        fedPayable                     : 0,
        discount                       : 0,
        saleType                       : 'Electricity Supply to Retailers',
        sroItemSerialNo                : '4',
      }],
    },
  },

  SN014: {
    description: 'Gas to CNG Stations',
    payload: {
      invoiceType           : 'Sale Invoice',
      buyerNTNCNIC          : '1000000000000',
      buyerBusinessName     : 'FERTILIZER MANUFAC IRS NEW',
      buyerProvince         : 'Sindh',
      buyerAddress          : 'Karachi',
      buyerRegistrationType : 'Unregistered',
      invoiceRefNo          : 'SI-20250515-001',
      items: [{
        hsCode                         : '0101.2100',
        productDescription             : 'TEST',
        rate                           : '18%',
        uoM                            : 'Numbers, pieces, units',
        quantity                       : 123,
        totalValues                    : 0,
        valueSalesExcludingST          : 1000,
        fixedNotifiedValueOrRetailPrice: 0,
        salesTaxApplicable             : 180,
        salesTaxWithheldAtSource       : 0,
        extraTax                       : 0,
        furtherTax                     : 0,
        sroScheduleNo                  : '',
        fedPayable                     : 0,
        discount                       : 0,
        saleType                       : 'Gas to CNG stations',
        sroItemSerialNo                : '',
      }],
    },
  },

  SN015: {
    description: 'Mobile Phones (Ninth Schedule)',
    payload: {
      invoiceType           : 'Sale Invoice',
      buyerNTNCNIC          : '1000000000000',
      buyerBusinessName     : 'FERTILIZER MANUFAC IRS NEW',
      buyerProvince         : 'Sindh',
      buyerAddress          : 'Karachi',
      buyerRegistrationType : 'Unregistered',
      invoiceRefNo          : 'SI-20250515-001',
      items: [{
        hsCode                         : '0101.2100',
        productDescription             : 'TEST',
        rate                           : '18%',
        uoM                            : 'Numbers, pieces, units',
        quantity                       : 123,
        totalValues                    : 0,
        valueSalesExcludingST          : 1234,
        fixedNotifiedValueOrRetailPrice: 0,
        salesTaxApplicable             : 222.12,
        salesTaxWithheldAtSource       : 0,
        extraTax                       : 0,
        furtherTax                     : 0,
        sroScheduleNo                  : 'NINTH SCHEDULE',
        fedPayable                     : 0,
        discount                       : 0,
        saleType                       : 'Mobile Phones',
        sroItemSerialNo                : '1(A)',
      }],
    },
  },

  SN016: {
    description: 'Processing / Conversion of Goods',
    payload: {
      invoiceType           : 'Sale Invoice',
      buyerNTNCNIC          : '1000000000078',
      buyerBusinessName     : 'FERTILIZER MANUFAC IRS NEW',
      buyerProvince         : 'Sindh',
      buyerAddress          : 'Karachi',
      buyerRegistrationType : 'Unregistered',
      invoiceRefNo          : '',
      items: [{
        hsCode                         : '0101.2100',
        productDescription             : 'test',
        rate                           : '5%',
        uoM                            : 'Numbers, pieces, units',
        quantity                       : 1,
        totalValues                    : 0,
        valueSalesExcludingST          : 100,
        fixedNotifiedValueOrRetailPrice: 0,
        salesTaxApplicable             : 5,
        salesTaxWithheldAtSource       : 0,
        extraTax                       : 0,
        furtherTax                     : 0,
        sroScheduleNo                  : '',
        fedPayable                     : 0,
        discount                       : 0,
        saleType                       : 'Processing/Conversion of Goods',
        sroItemSerialNo                : '',
      }],
    },
  },

  SN017: {
    description: 'Sale of Goods where FED is Charged in ST Mode',
    payload: {
      invoiceType           : 'Sale Invoice',
      buyerNTNCNIC          : '7000009',
      buyerBusinessName     : 'FERTILIZER MANUFAC IRS NEW',
      buyerProvince         : 'Sindh',
      buyerAddress          : 'Karachi',
      buyerRegistrationType : 'Unregistered',
      invoiceRefNo          : '',
      items: [{
        hsCode                         : '0101.2100',
        productDescription             : 'TEST',
        rate                           : '8%',
        uoM                            : 'Numbers, pieces, units',
        quantity                       : 1,
        totalValues                    : 0,
        valueSalesExcludingST          : 100,
        fixedNotifiedValueOrRetailPrice: 0,
        salesTaxApplicable             : 8,
        salesTaxWithheldAtSource       : 0,
        extraTax                       : 0,
        furtherTax                     : 0,
        sroScheduleNo                  : '',
        fedPayable                     : 0,
        discount                       : 0,
        saleType                       : 'Goods (FED in ST Mode)',
        sroItemSerialNo                : '',
      }],
    },
  },

  SN018: {
    description: 'Services where FED is Charged in ST Mode',
    payload: {
      invoiceType           : 'Sale Invoice',
      buyerNTNCNIC          : '1000000000056',
      buyerBusinessName     : 'FERTILIZER MANUFAC IRS NEW',
      buyerProvince         : 'Sindh',
      buyerAddress          : 'Karachi',
      buyerRegistrationType : 'Unregistered',
      invoiceRefNo          : 'SI-20250421-001',
      items: [{
        hsCode                         : '0101.2100',
        productDescription             : 'TEST',
        rate                           : '8%',
        uoM                            : 'Numbers, pieces, units',
        quantity                       : 20,
        totalValues                    : 0,
        valueSalesExcludingST          : 1000,
        fixedNotifiedValueOrRetailPrice: 0,
        salesTaxApplicable             : 80,
        salesTaxWithheldAtSource       : 0,
        extraTax                       : 0,
        furtherTax                     : 0,
        sroScheduleNo                  : '',
        fedPayable                     : 0,
        discount                       : 0,
        saleType                       : 'Services (FED in ST Mode)',
        sroItemSerialNo                : '',
      }],
    },
  },

  SN019: {
    description: 'Services (ICTO)',
    payload: {
      invoiceType           : 'Sale Invoice',
      buyerNTNCNIC          : '1000000000000',
      buyerBusinessName     : 'FERTILIZER MANUFAC IRS NEW',
      buyerProvince         : 'Sindh',
      buyerAddress          : 'Karachi',
      buyerRegistrationType : 'Unregistered',
      invoiceRefNo          : 'SI-20250421-001',
      items: [{
        hsCode                         : '0101.2900',
        productDescription             : 'TEST',
        rate                           : '5%',
        uoM                            : 'Numbers, pieces, units',
        quantity                       : 1,
        totalValues                    : 0,
        valueSalesExcludingST          : 100,
        fixedNotifiedValueOrRetailPrice: 0,
        salesTaxApplicable             : 5,
        salesTaxWithheldAtSource       : 0,
        extraTax                       : 0,
        furtherTax                     : 0,
        sroScheduleNo                  : 'ICTO TABLE I',
        fedPayable                     : 0,
        discount                       : 0,
        saleType                       : 'Services',
        sroItemSerialNo                : '1(ii)(ii)(a)',
      }],
    },
  },

  SN020: {
    description: 'Electric Vehicle (Sixth Schedule Table III)',
    payload: {
      invoiceType           : 'Sale Invoice',
      buyerNTNCNIC          : '1000000000000',
      buyerBusinessName     : 'FERTILIZER MANUFAC IRS NEW',
      buyerProvince         : 'Sindh',
      buyerAddress          : 'Karachi',
      buyerRegistrationType : 'Unregistered',
      invoiceRefNo          : 'SI-20250421-001',
      items: [{
        hsCode                         : '0101.2900',
        productDescription             : 'TEST',
        rate                           : '1%',
        uoM                            : 'Numbers, pieces, units',
        quantity                       : 122,
        totalValues                    : 0,
        valueSalesExcludingST          : 1000,
        fixedNotifiedValueOrRetailPrice: 0,
        salesTaxApplicable             : 10,
        salesTaxWithheldAtSource       : 0,
        extraTax                       : 0,
        furtherTax                     : 0,
        sroScheduleNo                  : '6th Schd Table III',
        fedPayable                     : 0,
        discount                       : 0,
        saleType                       : 'Electric Vehicle',
        sroItemSerialNo                : '20',
      }],
    },
  },

  SN021: {
    description: 'Cement / Concrete Block',
    payload: {
      invoiceType           : 'Sale Invoice',
      buyerNTNCNIC          : '1000000000000',
      buyerBusinessName     : 'FERTILIZER MANUFAC IRS NEW',
      buyerProvince         : 'Sindh',
      buyerAddress          : 'Karachi',
      buyerRegistrationType : 'Unregistered',
      invoiceRefNo          : 'SI-20250421-001',
      items: [{
        hsCode                         : '0101.2100',
        productDescription             : 'TEST',
        rate                           : 'Rs.3 per unit',
        uoM                            : 'Numbers, pieces, units',
        quantity                       : 12,
        totalValues                    : 0,
        valueSalesExcludingST          : 123,
        fixedNotifiedValueOrRetailPrice: 3,
        salesTaxApplicable             : 36,
        salesTaxWithheldAtSource       : 0,
        extraTax                       : 0,
        furtherTax                     : 0,
        sroScheduleNo                  : '',
        fedPayable                     : 0,
        discount                       : 0,
        saleType                       : 'Cement /Concrete Block',
        sroItemSerialNo                : '',
      }],
    },
  },

  SN022: {
    description: 'Potassium Chlorate (Eighth Schedule)',
    payload: {
      invoiceType           : 'Sale Invoice',
      buyerNTNCNIC          : '1000000000000',
      buyerBusinessName     : 'FERTILIZER MANUFAC IRS NEW',
      buyerProvince         : 'Sindh',
      buyerAddress          : 'Karachi',
      buyerRegistrationType : 'Unregistered',
      invoiceRefNo          : 'SI-20250421-001',
      items: [{
        hsCode                         : '3104.2000',
        productDescription             : 'TEST',
        rate                           : '18% + Rs.60/kg',
        uoM                            : 'KG',
        quantity                       : 1,
        totalValues                    : 0,
        valueSalesExcludingST          : 100,
        fixedNotifiedValueOrRetailPrice: 60,
        salesTaxApplicable             : 78,
        salesTaxWithheldAtSource       : 0,
        extraTax                       : 0,
        furtherTax                     : 0,
        sroScheduleNo                  : 'EIGHTH SCHEDULE Table 1',
        fedPayable                     : 0,
        discount                       : 0,
        saleType                       : 'Potassium Chlorate',
        sroItemSerialNo                : '56',
      }],
    },
  },

  SN023: {
    description: 'CNG Sales',
    payload: {
      invoiceType           : 'Sale Invoice',
      buyerNTNCNIC          : '1000000000000',
      buyerBusinessName     : 'FERTILIZER MANUFAC IRS NEW',
      buyerProvince         : 'Sindh',
      buyerAddress          : 'Karachi',
      buyerRegistrationType : 'Unregistered',
      invoiceRefNo          : 'SI-20250421-001',
      items: [{
        hsCode                         : '0101.2100',
        productDescription             : 'TEST',
        rate                           : 'Rs.200/unit',
        uoM                            : 'Numbers, pieces, units',
        quantity                       : 123,
        totalValues                    : 0,
        valueSalesExcludingST          : 234,
        fixedNotifiedValueOrRetailPrice: 200,
        salesTaxApplicable             : 24600,
        salesTaxWithheldAtSource       : 0,
        extraTax                       : 0,
        furtherTax                     : 0,
        sroScheduleNo                  : '581(1)/2024',
        fedPayable                     : 0,
        discount                       : 0,
        saleType                       : 'CNG Sales',
        sroItemSerialNo                : 'Region-I',
      }],
    },
  },

  SN024: {
    description: 'Goods as per SRO 297(I)/2023',
    payload: {
      invoiceType           : 'Sale Invoice',
      buyerNTNCNIC          : '1000000000000',
      buyerBusinessName     : 'FERTILIZER MANUFAC IRS NEW',
      buyerProvince         : 'Sindh',
      buyerAddress          : 'Karachi',
      buyerRegistrationType : 'Unregistered',
      invoiceRefNo          : 'SI-20250421-001',
      items: [{
        hsCode                         : '0101.2100',
        productDescription             : 'TEST',
        rate                           : '25%',
        uoM                            : 'Numbers, pieces, units',
        quantity                       : 123,
        totalValues                    : 0,
        valueSalesExcludingST          : 1000,
        fixedNotifiedValueOrRetailPrice: 0,
        salesTaxApplicable             : 250,
        salesTaxWithheldAtSource       : 0,
        extraTax                       : 0,
        furtherTax                     : 0,
        sroScheduleNo                  : '297(I)/2023-Table-I',
        fedPayable                     : 0,
        discount                       : 0,
        saleType                       : 'Goods as per SRO.297(|)/2023',
        sroItemSerialNo                : '12',
      }],
    },
  },

  SN025: {
    description: 'Non-Adjustable Supplies (Eighth Schedule)',
    payload: {
      invoiceType           : 'Sale Invoice',
      buyerNTNCNIC          : '1000000000078',
      buyerBusinessName     : 'FERTILIZER MANUFAC IRS NEW',
      buyerProvince         : 'Sindh',
      buyerAddress          : 'Karachi',
      buyerRegistrationType : 'Unregistered',
      invoiceRefNo          : '',
      items: [{
        hsCode                         : '0101.2100',
        productDescription             : 'TEST',
        rate                           : '0%',
        uoM                            : 'Numbers, pieces, units',
        quantity                       : 1,
        totalValues                    : 0,
        valueSalesExcludingST          : 100,
        fixedNotifiedValueOrRetailPrice: 0,
        salesTaxApplicable             : 0,
        salesTaxWithheldAtSource       : 0,
        extraTax                       : 0,
        furtherTax                     : 0,
        sroScheduleNo                  : 'EIGHTH SCHEDULE Table 1',
        fedPayable                     : 0,
        discount                       : 0,
        saleType                       : 'Non-Adjustable Supplies',
        sroItemSerialNo                : '81',
      }],
    },
  },

  SN026: {
    description: 'Goods at Standard Rate (with Invoice Ref)',
    payload: {
      invoiceType           : 'Sale Invoice',
      buyerNTNCNIC          : '1000000000078',
      buyerBusinessName     : 'FERTILIZER MANUFAC IRS NEW',
      buyerProvince         : 'Sindh',
      buyerAddress          : 'Karachi',
      buyerRegistrationType : 'Unregistered',
      invoiceRefNo          : 'SI-20250421-001',
      items: [{
        hsCode                         : '0101.2100',
        productDescription             : 'TEST',
        rate                           : '18%',
        uoM                            : 'Numbers, pieces, units',
        quantity                       : 123,
        totalValues                    : 0,
        valueSalesExcludingST          : 1000,
        fixedNotifiedValueOrRetailPrice: 0,
        salesTaxApplicable             : 180,
        salesTaxWithheldAtSource       : 0,
        extraTax                       : 0,
        furtherTax                     : 0,
        sroScheduleNo                  : '',
        fedPayable                     : 0,
        discount                       : 0,
        saleType                       : 'Goods at standard rate (default)',
        sroItemSerialNo                : '',
      }],
    },
  },

  SN027: {
    description: 'Third Schedule Goods (Fixed Retail Price)',
    payload: {
      invoiceType           : 'Sale Invoice',
      buyerNTNCNIC          : '7000006',
      buyerBusinessName     : 'FERTILIZER MANUFAC IRS NEW',
      buyerProvince         : 'Sindh',
      buyerAddress          : 'Karachi',
      buyerRegistrationType : 'Unregistered',
      invoiceRefNo          : '',
      items: [{
        hsCode                         : '0101.2100',
        productDescription             : 'test',
        rate                           : '18%',
        uoM                            : 'Numbers, pieces, units',
        quantity                       : 1,
        totalValues                    : 0,
        valueSalesExcludingST          : 0.01,
        fixedNotifiedValueOrRetailPrice: 100,
        salesTaxApplicable             : 18,
        salesTaxWithheldAtSource       : 0,
        extraTax                       : 0,
        furtherTax                     : 0,
        sroScheduleNo                  : '',
        fedPayable                     : 0,
        discount                       : 0,
        saleType                       : '3rd Schedule Goods',
        sroItemSerialNo                : '',
      }],
    },
  },

  SN028: {
    description: 'Reduced Rate with Fixed/Notified Value (Eighth Schedule)',
    payload: {
      invoiceType           : 'Sale Invoice',
      buyerNTNCNIC          : '1000000000000',
      buyerBusinessName     : 'FERTILIZER MANUFAC IRS NEW',
      buyerProvince         : 'Sindh',
      buyerAddress          : 'Karachi',
      buyerRegistrationType : 'Unregistered',
      invoiceRefNo          : '',
      items: [{
        hsCode                         : '0101.2100',
        productDescription             : 'TEST',
        rate                           : '1%',
        uoM                            : 'Numbers, pieces, units',
        quantity                       : 1,
        totalValues                    : 100,
        valueSalesExcludingST          : 99.01,
        fixedNotifiedValueOrRetailPrice: 100,
        salesTaxApplicable             : 0.99,
        salesTaxWithheldAtSource       : 0,
        extraTax                       : '',
        furtherTax                     : 0,
        sroScheduleNo                  : 'EIGHTH SCHEDULE Table 1',
        fedPayable                     : 0,
        discount                       : 0,
        saleType                       : 'Goods at Reduced Rate',
        sroItemSerialNo                : '70',
      }],
    },
  },

};

// ─── Route ────────────────────────────────────────────────────────────────────

router.post('/run-scenarios', userAuth, async (req, res) => {
  const {
    token,
    sellerNTNCNIC,
    sellerBusinessName,
    sellerProvince,
    sellerAddress,
    scenarios: requestedIds,
  } = req.body ?? {};

  if (!token)              return res.status(400).json({ error: 'token is required' });
  if (!sellerNTNCNIC)      return res.status(400).json({ error: 'sellerNTNCNIC is required' });
  if (!sellerBusinessName) return res.status(400).json({ error: 'sellerBusinessName is required' });
  if (!sellerProvince)     return res.status(400).json({ error: 'sellerProvince is required' });
  if (!sellerAddress)      return res.status(400).json({ error: 'sellerAddress is required' });

  const idsToRun = Array.isArray(requestedIds) && requestedIds.length > 0
    ? requestedIds
    : Object.keys(ALL_SCENARIOS);

  const unknown = idsToRun.filter(id => !ALL_SCENARIOS[id]);
  if (unknown.length > 0) {
    return res.status(400).json({ error: `Unknown scenario IDs: ${unknown.join(', ')}` });
  }

  const today   = new Date().toISOString().split('T')[0];
  const results = [];

  for (const id of idsToRun) {
    const scenario = ALL_SCENARIOS[id];

    const invoice = {
      ...scenario.payload,
      invoiceDate        : today,
      scenarioId         : id,
      sellerNTNCNIC,
      sellerBusinessName,
      sellerProvince,
      sellerAddress,
    };

    try {
      const result    = await submitInvoice(token, invoice);
      const fbrStatus = result.data?.validationResponse?.statusCode;
      const passed    = fbrStatus === '00';
      const invoiceNo = result.data?.invoiceNumber ?? result.data?.fbrInvoiceNo ?? null;

      const itemErrors = !passed
        ? (result.data?.validationResponse?.invoiceStatuses ?? [])
            .filter(s => s.statusCode !== '00')
            .map(s => `Item ${s.itemSNo}: ${s.error}`)
        : [];

      results.push({
        scenarioId  : id,
        description : scenario.description,
        status      : passed ? 'PASSED' : 'INVALID',
        invoiceNo,
        fbrError    : passed ? undefined : (result.data?.validationResponse?.error || itemErrors.join(' | ') || undefined),
        data        : result.data,
      });
    } catch (err) {
      results.push({
        scenarioId  : id,
        description : scenario.description,
        status      : 'FAILED',
        invoiceNo   : null,
        code        : err instanceof FbrError ? err.code : 'UNKNOWN',
        error       : err.message,
        fbrResponse : err instanceof FbrError ? err.responseBody : null,
      });
    }
  }

  const passed  = results.filter(r => r.status === 'PASSED').length;
  const invalid = results.filter(r => r.status === 'INVALID').length;
  const failed  = results.filter(r => r.status === 'FAILED').length;

  const passedIds = results.filter(r => r.status === 'PASSED').map(r => r.scenarioId);

  if (passedIds.length > 0) {
    await user.findByIdAndUpdate(req.userId, {
      fbrApprovedScenarios: passedIds,
      fbrSandboxPassedAt:   new Date(),
  });
}

  return res.status(200).json({
    summary : { total: results.length, passed, invalid, failed, },
    results,
    success: true
  });
});

//router.post('/run-scenarios', async (req, res) => {
//  console.log(`[${new Date().toISOString()}] Incoming /run-scenarios request`);
//  console.log('Body:', JSON.stringify(req.body, null, 2));

//  const {
//    token,
//    sellerNTNCNIC,
//    sellerBusinessName,
//    sellerProvince,
//    sellerAddress,
//    scenarios: requestedIds,
//  } = req.body ?? {};

//  if (!token) {
//    console.warn('Missing token');
//    return res.status(400).json({ error: 'token is required' });
//  }
//  if (!sellerNTNCNIC) {
//    console.warn('Missing sellerNTNCNIC');
//    return res.status(400).json({ error: 'sellerNTNCNIC is required' });
//  }
//  if (!sellerBusinessName) {
//    console.warn('Missing sellerBusinessName');
//    return res.status(400).json({ error: 'sellerBusinessName is required' });
//  }
//  if (!sellerProvince) {
//    console.warn('Missing sellerProvince');
//    return res.status(400).json({ error: 'sellerProvince is required' });
//  }
//  if (!sellerAddress) {
//    console.warn('Missing sellerAddress');
//    return res.status(400).json({ error: 'sellerAddress is required' });
//  }

//  const idsToRun =
//    Array.isArray(requestedIds) && requestedIds.length > 0
//      ? requestedIds
//      : Object.keys(ALL_SCENARIOS);

//  console.log('Scenarios to execute:', idsToRun);

//  const unknown = idsToRun.filter(id => !ALL_SCENARIOS[id]);
//  if (unknown.length > 0) {
//    console.warn('Unknown scenario IDs:', unknown);
//    return res.status(400).json({
//      error: `Unknown scenario IDs: ${unknown.join(', ')}`,
//    });
//  }

//  const today = new Date().toISOString().split('T')[0];
//  const results = [];

//  for (const id of idsToRun) {
//    const scenario = ALL_SCENARIOS[id];

//    const invoice = {
//      ...scenario.payload,
//      invoiceDate: today,
//      scenarioId: id,
//      sellerNTNCNIC,
//      sellerBusinessName,
//      sellerProvince,
//      sellerAddress,
//    };

//    console.log(`\n--- Running Scenario ${id} ---`);
//    console.log('Invoice Payload:', JSON.stringify(invoice, null, 2));

//    try {
//      const result = await submitInvoice(token, invoice);

//      console.log('Raw FBR Response:', JSON.stringify(result.data, null, 2));

//      const fbrStatus = result.data?.validationResponse?.statusCode;
//      const passed = fbrStatus === '00';
//      const invoiceNo =
//        result.data?.invoiceNumber ?? result.data?.fbrInvoiceNo ?? null;

//      const itemErrors = !passed
//        ? (result.data?.validationResponse?.invoiceStatuses ?? [])
//            .filter(s => s.statusCode !== '00')
//            .map(s => `Item ${s.itemSNo}: ${s.error}`)
//        : [];

//      console.log(
//        `Scenario ${id} completed with status: ${
//          passed ? 'PASSED' : 'INVALID'
//        }`
//      );

//      results.push({
//        scenarioId: id,
//        description: scenario.description,
//        status: passed ? 'PASSED' : 'INVALID',
//        invoiceNo,
//        fbrError: passed
//          ? undefined
//          : (result.data?.validationResponse?.error ||
//             itemErrors.join(' | ') ||
//             undefined),
//        data: result.data,
//      });
//    } catch (err) {
//      console.error(`Scenario ${id} FAILED`);
//      console.error('Error message:', err.message);

//      if (err instanceof FbrError) {
//        console.error('FBR Code:', err.code);
//        console.error('FBR Response:', err.responseBody);
//      }

//      results.push({
//        scenarioId: id,
//        description: scenario.description,
//        status: 'FAILED',
//        invoiceNo: null,
//        code: err instanceof FbrError ? err.code : 'UNKNOWN',
//        error: err.message,
//        fbrResponse: err instanceof FbrError ? err.responseBody : null,
//      });
//    }
//  }

//  const passed = results.filter(r => r.status === 'PASSED').length;
//  const invalid = results.filter(r => r.status === 'INVALID').length;
//  const failed = results.filter(r => r.status === 'FAILED').length;

//  console.log('\n=== Scenario Batch Summary ===');
//  console.log({ total: results.length, passed, invalid, failed });

//  return res.status(200).json({
//    summary: { total: results.length, passed, invalid, failed },
//    results,
//  });
//});

export default router;