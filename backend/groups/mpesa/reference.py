def generate_account_reference(transaction_id):
    return f"CONTRIB{transaction_id}"[:12]


def generate_transaction_description(transaction_id):
    return f"PAYMENT-{transaction_id}"[:13]