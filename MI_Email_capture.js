/*eslint-disable*/
/**
*
* @author Dhruv Soni
* @version 1.0
*
* Version Type     Date                Author
* 1.0              07 Jan 2025         Dhruv Soni
*/

// Email Plugin entry point

function process(email) {
  try {
    
    var subject = email.getSubject();
    var textbody = email.getTextBody();
    var sender = email.getFrom(); 
        nlapiLogExecution("DEBUG", 'sender', sender);

    if(sender != 'flows@molisana.com' && sender != 'frank@molisana.com' && sender != 'AppDev@molisana.com') return;
    
    nlapiLogExecution("DEBUG", 'subject', subject);
    nlapiLogExecution("DEBUG", 'textbody', textbody);
    nlapiLogExecution("DEBUG", 'sender', sender);
    var parts = subject.split('_');
    var vendorBillDocNumber = parts[0]; // "VENDBILL33895"
    var vendorName = parts[1];          // "COLAVITA®"
    var vendorRefNumber = parts[2];     // "916_00_126"
    nlapiLogExecution("DEBUG", 'vendorBillDocNumber', vendorBillDocNumber);
    vendorName = vendorName.replace(/[^a-zA-Z0-9\s]/g, '');
    nlapiLogExecution("DEBUG", 'vendorName', vendorName);


   //  if (textbody) {
   //   // Extract everything after "now approved"
   //   var startIndex = textbody.toLowerCase().indexOf("now approved");
   //   var approvedId = null;

   //   if (startIndex !== -1) {
   //     approvedId = textbody.substring(startIndex + "now approved".length).trim();
   //   }

   //   nlapiLogExecution("DEBUG", 'approvedId', approvedId);

   //   if (approvedId) {
   //     nlapiLogExecution('DEBUG', 'Approved ID', approvedId);
   //   } 
   // } 

    
    var vendorbillSearch = nlapiSearchRecord("vendorbill",null,
  [
     ["type","anyof","VendBill"], 
     "AND", 
     ["transactionnumber","is",vendorBillDocNumber], 
     "AND", 
     ["mainline","is","T"]
  ], 
  [
     new nlobjSearchColumn("internalid"), 
     new nlobjSearchColumn("tranid")
  ]
  );
    
    if (vendorbillSearch && vendorbillSearch.length > 0) {
      var billId = vendorbillSearch[0].getValue('internalid');
      nlapiLogExecution("DEBUG", 'billId', billId);

      var billRecord = nlapiLoadRecord('vendorbill', billId);
      billRecord.setFieldValue('approvalstatus', '2'); // 2 = Approved

      billRecord.setFieldValue('custbody_mi_approval_notes', textbody); // 2 = Approved
      nlapiSubmitRecord(billRecord);
      nlapiLogExecution('DEBUG', 'Vendor Bill Approved', 'Bill ID: ' + billId);

      
    }
      
      
      
    } catch (error) {
      nlapiLogExecution('ERROR', 'Error', error.toString());
    }
  }
