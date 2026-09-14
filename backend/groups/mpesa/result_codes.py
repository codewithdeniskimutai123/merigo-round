def get_transaction_status(result_code):
   
    if result_code == 0:
        return "SUCCESS"

    if result_code == 1032:
        return "CANCELLED"

    return "FAILED"