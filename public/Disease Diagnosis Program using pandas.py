# Refined Disease Diagnosis Program using pandas + scikit-learn + visualization

import pandas as pd
from sklearn.tree import DecisionTreeClassifier, plot_tree
import matplotlib.pyplot as plt

def disease_diagnosis_ml_pandas():
    print("Welcome to Jeshi Hospital")

    # Create dataset with pandas
    data = {
        "vomiting":      [1, 1, 0, 0],
        "diarrhea":      [1, 0, 0, 0],
        "fever":         [0, 1, 0, 0],
        "chest pain":    [0, 0, 1, 0],
        "wheezing sound":[0, 0, 1, 0],
        "frequent urination":[0, 0, 0, 1],
        "fluctuations of sugar levels":[0, 0, 0, 1],
        "disease":       ["Typhoid", "Malaria", "Pneumonia", "Diabetes"]
    }

    df = pd.DataFrame(data)

    # Features and target
    X = df.drop("disease", axis=1)
    y = df["disease"]

    # Train classifier
    clf = DecisionTreeClassifier(random_state=42)
    clf.fit(X, y)

    # Capture patient details
    name = input("Enter Patient Name: ")
    gender = input("Enter Gender: ")
    age = int(input("Enter Age: "))
    residence = input("Enter Place of Residence: ")

    # Capture symptoms
    symptom1 = input("Enter Symptom 1: ").lower().strip()
    symptom2 = input("Enter Symptom 2: ").lower().strip()

    # Encode patient symptoms
    patient_symptoms = {col:0 for col in X.columns}
    for s in [symptom1, symptom2]:
        if s in patient_symptoms:
            patient_symptoms[s] = 1

    # Predict diagnosis
    patient_df = pd.DataFrame([patient_symptoms])
    diagnosis = clf.predict(patient_df)[0]

    # Display results
    print("\n--- Patient Diagnosis Report ---")
    print(f"Name: {name}")
    print(f"Gender: {gender}")
    print(f"Age: {age}")
    print(f"Residence: {residence}")
    print(f"Symptoms: {symptom1}, {symptom2}")
    print(f"Diagnosis: {diagnosis}")

    # Visualization of decision tree
    plt.figure(figsize=(10,6))
    plot_tree(clf, feature_names=X.columns, class_names=clf.classes_, filled=True)
    plt.title("Disease Diagnosis Decision Tree")

    # Show and save the plot
    plt.show()
    plt.savefig("decision_tree.png")
    print("Decision tree visualization saved as 'decision_tree.png'")

# Run program
disease_diagnosis_ml_pandas()
