import re


def normalize_phone_number(phone_number):
   
    phone = str(phone_number).strip()

    phone = re.sub(r"\D", "", phone)

    if phone.startswith("0"):
        phone = "254" + phone[1:]

    elif phone.startswith("7") or phone.startswith("1"):
        phone = "254" + phone

    elif phone.startswith("254"):
        pass

    else:
        raise ValueError("Invalid Kenyan phone number.")

    if not re.fullmatch(r"254[71]\d{8}", phone):
        raise ValueError("Invalid Kenyan phone number.")

    return phone
