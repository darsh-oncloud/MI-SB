/*eslint-disable*/
/**
*
* @author Dhruv Soni
* @version 1.0
*
* Simple email plugin - approves vendor bill based on subject
* Subject format: Approve_VENDBILL48791
*/
function process(email) {
  try {

    var subject = email.getSubject();
    var sender = email.getFrom();

    nlapiLogExecution("DEBUG", "sender", sender);
    nlapiLogExecution("DEBUG", "subject", subject);

    // only process test email for now
    // if (sender != "dhruvsoni1706@gmail.com") return;

    var parts = subject.split('_');
    var action = parts[0];               // "Approve"
    var vendorBillDocNumber = parts[1];  // "VENDBILL48791"

    nlapiLogExecution("DEBUG", "action", action);
    nlapiLogExecution("DEBUG", "vendorBillDocNumber", vendorBillDocNumber);

    if (action.toLowerCase() != "approve") return;
    if (!vendorBillDocNumber) return;

    var vendorbillSearch = nlapiSearchRecord("vendorbill", null,
      [
        ["type", "anyof", "VendBill"],
        "AND",
        ["transactionnumber", "is", vendorBillDocNumber],
        "AND",
        ["mainline", "is", "T"]
      ],
      [
        new nlobjSearchColumn("internalid"),
        new nlobjSearchColumn("tranid")
      ]
    );

    if (vendorbillSearch && vendorbillSearch.length > 0) {
      var billId = vendorbillSearch[0].getValue("internalid");
      nlapiLogExecution("DEBUG", "billId", billId);

      var billRecord = nlapiLoadRecord("vendorbill", billId);
      billRecord.setFieldValue("approvalstatus", "2"); // 2 = Approved
      nlapiSubmitRecord(billRecord);

      nlapiLogExecution("DEBUG", "Vendor Bill Approved", "Bill ID: " + billId);
    } else {
      nlapiLogExecution("DEBUG", "No matching bill found", vendorBillDocNumber);
    }

  } catch (error) {
    nlapiLogExecution("ERROR", "Error", error.toString());
  }
}