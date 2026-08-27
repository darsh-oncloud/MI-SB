/*eslint-disable*/

var APPROVER_ID = '-5';

var VALIDATOR_FIELD = 'custbody_vendbill_validator';
var VALIDATED_FIELD = 'custbody_vendbill_validator_check';
var APPROVER_FIELD  = 'custbody_bill_approver';
var NOTES_FIELD     = 'custbody_mi_approval_notes';

function process(email) {
    try {
        var match = String(email.getSubject() || '').trim().match(/^(Approve|Reject)_(.+)$/i);
        if (!match) return;

        var action = match[1].toLowerCase();
        var billNumber = match[2].trim();
        var emailBody = email.getTextBody() || '';

        var results = nlapiSearchRecord('vendorbill', null,
            [
                ['type', 'anyof', 'VendBill'], 'AND',
                ['transactionnumber', 'is', billNumber], 'AND',
                ['mainline', 'is', 'T']
            ],
            [
                new nlobjSearchColumn('internalid'),
                new nlobjSearchColumn('fxamount'),
                new nlobjSearchColumn('amount')
            ]
        );

        if (!results || !results.length) {
            nlapiLogExecution('ERROR', 'Bill Not Found', billNumber);
            return;
        }

        var billId = results[0].getId();
        var amount = parseFloat(results[0].getValue('fxamount') || 0) || 0;

        var values = nlapiLookupField('vendorbill', billId, [
            VALIDATOR_FIELD,
            VALIDATED_FIELD,
            APPROVER_FIELD,
            NOTES_FIELD
        ]);

        var validatorId = String(values[VALIDATOR_FIELD] || '');
        var approverId = String(values[APPROVER_FIELD] || '');
        var validated = values[VALIDATED_FIELD] === 'T';
        // var oldNotes = values[NOTES_FIELD] || '';

        // var notes = oldNotes +
        //     (oldNotes ? '\n\n--------------------\n\n' : '') +
        //     action.toUpperCase() + '\n' + emailBody;

        // nlapiLogExecution('AUDIT', 'Bill',
        //     billNumber + ' | Amount: ' + amount +
        //     ' | Validator: ' + validatorId +
        //     ' | Approver: ' + approverId +
        //     ' | Validated: ' + validated
        // );
var oldNotes = values[NOTES_FIELD] || '';

var commentPos = emailBody.toUpperCase().indexOf('COMMENTS:');
var comment = commentPos >= 0
    ? emailBody.substring(commentPos + 9).trim()
    : '';

var notes = oldNotes;

if (comment) {
    notes = oldNotes +
        (oldNotes ? '\n\n--------------------\n\n' : '') +
        nlapiDateToString(new Date()) + '\n' +
        comment;
}
        // Reject
        if (action === 'reject') {
            nlapiSubmitField('vendorbill', billId,
                ['approvalstatus', NOTES_FIELD],
                ['3', notes]
            );
            return;
        }

        // Teresa is Validator -> approve directly
        if (validatorId === APPROVER_ID) {
            nlapiSubmitField('vendorbill', billId,
                ['approvalstatus', VALIDATED_FIELD, NOTES_FIELD],
                ['2', 'T', notes]
            );
            return;
        }

        // First Validator approval
        if (!validated) {
            var fields = [VALIDATED_FIELD, NOTES_FIELD];
            var vals = ['T', notes];

            // <= $1,000 -> approve immediately
            if (amount <= 1000) {
                fields.push('approvalstatus');
                vals.push('2');
            }

            nlapiSubmitField('vendorbill', billId, fields, vals);
            return;
        }

        // Second approval from Teresa
        if (approverId === APPROVER_ID) {
            nlapiSubmitField('vendorbill', billId,
                ['approvalstatus', NOTES_FIELD],
                ['2', notes]
            );
        }

    } catch (e) {
        nlapiLogExecution('ERROR', 'Email Capture Error', e.toString());
    }
}