/*eslint-disable*/
/**
 * Subject:
 * Approve_VENDBILL48791
 * Reject_VENDBILL48791
 */

var APPROVER_ID = '-5';

var VALIDATOR_FIELD = 'custbody_vendbill_validator';
var VALIDATED_FIELD = 'custbody_vendbill_validator_check';
var APPROVER_FIELD  = 'custbody_bill_approver';
var NOTES_FIELD     = 'custbody_mi_approval_notes';
var AMOUNT_FIELD    = 'usertotal';

function process(email) {
  try {
    var match = String(email.getSubject() || '')
      .trim()
      .match(/^(Approve|Reject)_(.+)$/i);

    if (!match) return;

    var action = match[1].toLowerCase();
    var billNumber = match[2].trim();
    var emailBody = email.getTextBody() || '';

    var results = nlapiSearchRecord('vendorbill', null,
      [
        ['type', 'anyof', 'VendBill'],
        'AND',
        ['transactionnumber', 'is', billNumber],
        'AND',
        ['mainline', 'is', 'T']
      ],
      [new nlobjSearchColumn('internalid')]
    );

    if (!results || !results.length) {
      nlapiLogExecution('ERROR', 'Bill Not Found', billNumber);
      return;
    }

    var billId = results[0].getId();

    var values = nlapiLookupField('vendorbill', billId, [
      VALIDATOR_FIELD,
      VALIDATED_FIELD,
      APPROVER_FIELD,
      NOTES_FIELD,
      AMOUNT_FIELD
    ]);

    var validatorId = String(values[VALIDATOR_FIELD] || '');
    var approverId = String(values[APPROVER_FIELD] || '');
    var validated = values[VALIDATED_FIELD] === 'T';

    var amount = parseFloat(
      String(values[AMOUNT_FIELD] || '0').replace(/[^0-9.-]/g, '')
    ) || 0;

    var oldNotes = values[NOTES_FIELD] || '';
    var notes = oldNotes +
      (oldNotes ? '\n\n--------------------\n\n' : '') +
      action.toUpperCase() + '\n' + emailBody;

    // Reject immediately
    if (action === 'reject') {
      nlapiSubmitField(
        'vendorbill',
        billId,
        ['approvalstatus', NOTES_FIELD],
        ['3', notes]
      );
      return;
    }

    // Teresa is the Validator: approve directly
    if (validatorId === APPROVER_ID) {
      nlapiSubmitField(
        'vendorbill',
        billId,
        ['approvalstatus', VALIDATED_FIELD, NOTES_FIELD],
        ['2', 'T', notes]
      );
      return;
    }

    // First approval from another Validator
    if (!validated) {
      var fields = [VALIDATED_FIELD, NOTES_FIELD];
      var fieldValues = ['T', notes];

      // Amount $1,000 or less: validate and approve
      if (amount <= 1000) {
        fields.push('approvalstatus');
        fieldValues.push('2');
      }

      // Amount greater than $1,000:
      // only check the Validated checkbox
      nlapiSubmitField('vendorbill', billId, fields, fieldValues);
      return;
    }

    // Second approval from Teresa
    if (validated && approverId === APPROVER_ID) {
      nlapiSubmitField(
        'vendorbill',
        billId,
        ['approvalstatus', NOTES_FIELD],
        ['2', notes]
      );
    }

  } catch (e) {
    nlapiLogExecution(
      'ERROR',
      'Email Capture Error',
      e.toString()
    );
  }
}