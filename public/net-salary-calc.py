import numpy as np

def net_salary_numpy():
    # Capture employee details
    payroll_no = input("Enter Payroll Number: ")
    name = input("Enter Employee Name: ")
    gender = input("Enter Gender: ")
    department = input("Enter Department: ")
    basic_salary = float(input("Enter Basic Salary: "))

    # Allowances (constants)
    house_allowance = 6500
    medical_allowance = 5500

    # Use NumPy arrays for calculations
    basic = np.array([basic_salary])
    allowances = np.array([house_allowance + medical_allowance])
    gross_pay = basic + allowances

    # P.A.Y.E calculation using vectorized conditions
    paye = np.where(gross_pay > 49000, 0.06 * gross_pay,
           np.where((gross_pay >= 31000) & (gross_pay <= 39000), 0.05 * gross_pay,
           np.where((gross_pay >= 20000) & (gross_pay <= 30000), 0.04 * gross_pay, 0)))

    # NHIF and NSSF
    nhif = 0.02 * gross_pay
    nssf = 0.03 * gross_pay

    # Total deductions
    total_deductions = paye + nhif + nssf

    # Net Pay
    net_pay = gross_pay - total_deductions

    # Display results
    print("\n--- Employee Payroll Details ---")
    print(f"Payroll Number: {payroll_no}")
    print(f"Name: {name}")
    print(f"Gender: {gender}")
    print(f"Department: {department}")
    print(f"Basic Salary: {basic_salary}")
    print(f"Gross Pay: {gross_pay[0]}")
    print(f"P.A.Y.E: {paye[0]}")
    print(f"NHIF: {nhif[0]}")
    print(f"NSSF: {nssf[0]}")
    print(f"Total Deductions: {total_deductions[0]}")
    print(f"Net Pay: {net_pay[0]}")

# Run program
net_salary_numpy()
