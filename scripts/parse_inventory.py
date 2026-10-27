import csv
import re
import json

CAT_PREFIX = {
    'Micro Dot': 'MD',
    'Tricoat': 'TC',
    'STRETCH': 'ST',
    'Felt - Lappa': 'FL',
    'UNDER COLOUR FELT': 'UCF',
    'HAIR BUKRAM': 'HB',
    'SHIRST FUSE': 'SF',
    'SHOULDER PAD': 'SP',
    'WATER SOLUBLE': 'WS',
    'KURKURA': 'KR',
    'R/S TAPE': 'TP',
}

COLOUR_MAP = {
    'white': 'WHT',
    'wht': 'WHT',
    'black': 'BLK',
    'blk': 'BLK',
    'off white': 'OFW',
    'off-white': 'OFW',
    'charcol': 'CHR',
    'charcaol': 'CHR',
    'charcoal': 'CHR',
    'grey': 'GRY',
    'gray': 'GRY',
    'dark grey': 'DGRY',
    'light grey': 'LGRY',
    'navy blue': 'NVY',
    'royal blue': 'RBLU',
    'light blue': 'LBLU',
    'dark blue': 'DBLU',
    'brown': 'BRN',
    'light brown': 'LBRN',
    'wine': 'WINE',
    'maroon': 'MRN',
    'cream': 'CRM',
    'tan': 'TAN',
    'phone': 'PHN',
    'milanch': 'MLN',
}

def clean_val(v):
    if not v:
        return ""
    return v.replace('\u00a0', ' ').strip()

def clean_code_part(s):
    s = s.upper()
    # replace non-alphanumeric with hyphen
    s = re.sub(r'[^A-Z0-9]+', '-', s)
    return s.strip('-')

def clean_colour(c):
    c = clean_val(c)
    if not c or c in ['-', '-----', '-----------', '----']:
        return "Standard"
    lower = c.lower()
    if lower in COLOUR_MAP:
        # Title case standard name
        return c.strip().title()
    # Normalize some common ones
    return c.strip().title()

def get_colour_code(c):
    c_clean = clean_val(c).lower()
    for k, v in COLOUR_MAP.items():
        if k in c_clean:
            return v
    if not c_clean or c_clean in ['-', '-----', '-----------', '----']:
        return "STD"
    alphanumeric = re.sub(r'[^A-Z0-9]', '', c_clean.upper())
    return alphanumeric[:3] or "STD"

def parse_all():
    lines = open('prisma/raw_inventory.csv', encoding='utf-8').read().splitlines()
    current_category = None
    items = []

    for idx, line in enumerate(lines):
        line = line.strip()
        if not line:
            continue
        if idx == 0 and "ITEM CODE" in line:
            continue
        
        parts = [clean_val(p) for p in line.split(',')]
        first = parts[0]
        if not first.isdigit() and len(parts) >= 2 and all(p == '' for p in parts[1:]):
            current_category = first.replace(' ,', '').strip()
            continue
        elif not first.isdigit() and any(cat in line for cat in CAT_PREFIX.keys()):
            current_category = first.strip()
            continue

        if len(parts) < 2:
            continue

        s_no = parts[0]
        item_code = parts[1] if len(parts) > 1 else ""
        item_name = parts[2] if len(parts) > 2 else ""
        item_colour = parts[3] if len(parts) > 3 else ""
        size_inch = parts[4] if len(parts) > 4 else ""
        size_mtr = parts[5] if len(parts) > 5 else ""
        uom = parts[6] if len(parts) > 6 else "ROLL"
        if not uom:
            uom = "ROLL"

        if not item_code and not item_name:
            continue

        items.append({
            "category": current_category or "Fabric",
            "s_no": s_no,
            "item_code": item_code,
            "item_name": item_name,
            "item_colour": item_colour,
            "size_inch": size_inch,
            "size_mtr": size_mtr,
            "uom": uom
        })

    used_codes = set()
    sku_records = []

    for it in items:
        cat = it['category']
        cat_pfx = CAT_PREFIX.get(cat, 'FAB')
        item_code_clean = clean_code_part(it['item_code'])
        if not item_code_clean:
            item_code_clean = clean_code_part(it['item_name']) or "ITEM"

        clr_code = get_colour_code(it['item_colour'])
        
        size_part = ""
        inch_clean = clean_code_part(it['size_inch'])
        mtr_clean = clean_code_part(it['size_mtr'])
        
        if inch_clean and mtr_clean:
            size_part = f"{inch_clean}X{mtr_clean}"
        elif inch_clean:
            size_part = inch_clean
        elif mtr_clean:
            size_part = f"{mtr_clean}M"
        
        base_sku = f"{cat_pfx}-{item_code_clean}"
        if clr_code:
            base_sku += f"-{clr_code}"
        if size_part:
            base_sku += f"-{size_part}"

        # Clean multiple hyphens
        base_sku = re.sub(r'-+', '-', base_sku).strip('-')
        
        # Ensure under 40 chars for max compatibility
        if len(base_sku) > 36:
            base_sku = base_sku[:36]

        candidate_sku = base_sku
        counter = 2
        while candidate_sku in used_codes:
            candidate_sku = f"{base_sku[:34]}-{counter}"
            counter += 1
        used_codes.add(candidate_sku)

        # Build fabricName
        fabric_name = it['item_name']
        if not fabric_name or fabric_name in ['-', '---------------']:
            fabric_name = it['category']
        fabric_name = fabric_name.strip().title()

        # Build pattern
        pattern = "Plain"
        col_lower = it['item_colour'].lower()
        name_lower = it['item_name'].lower()
        if "double dot" in col_lower or "double dot" in name_lower:
            pattern = "Double Dot"
        elif "dot" in col_lower or "dot" in name_lower or "pd" in col_lower or "p.d" in col_lower:
            pattern = "Micro Dot"
        elif "lappa" in name_lower:
            pattern = "Lappa"
        elif "fuse" in name_lower:
            pattern = "Fusible"

        # Quantity / Stock in metres
        # If size_mtr is numeric, use it as initial stock or 100
        qty = 0
        mtr_num_match = re.search(r'\d+', it['size_mtr'])
        if mtr_num_match:
            qty = float(mtr_num_match.group())
        elif "100" in it['size_mtr']:
            qty = 100.0
        else:
            qty = 50.0

        # Width info
        inch_str = it['size_inch'] if it['size_inch'] else "N/A"
        mtr_str = it['size_mtr'] if it['size_mtr'] else "N/A"
        uom_str = it['uom'].upper() if it['uom'] else "ROLL"

        other_identifiers = f"Item Code: {it['item_code']} | Width: {inch_str} | Length: {mtr_str} | UOM: {uom_str} | S.No: {it['s_no']} ({it['category']})"

        sku_records.append({
            "code": candidate_sku,
            "fabricName": fabric_name,
            "fabricType": it['category'].title(),
            "colour": clean_colour(it['item_colour']),
            "pattern": pattern,
            "otherIdentifiers": other_identifiers,
            "sellingPricePerMetre": 120.00,  # Default standard selling price
            "lowStockThreshold": 20.00,
            "currentStock": qty,
            "raw": it
        })

    return sku_records

if __name__ == '__main__':
    skus = parse_all()
    print(f"Generated {len(skus)} unique SKU records.")
    print("First 10 generated SKUs:")
    for s in skus[:10]:
        print(f"  {s['code']}: {s['fabricName']} | {s['colour']} | {s['currentStock']}m | {s['otherIdentifiers']}")
    print("\nLast 5 generated SKUs:")
    for s in skus[-5:]:
        print(f"  {s['code']}: {s['fabricName']} | {s['colour']} | {s['currentStock']}m | {s['otherIdentifiers']}")
