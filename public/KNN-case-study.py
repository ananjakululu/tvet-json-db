# Step 1: Import Libraries
import pandas as pd
import numpy as np
from sklearn.datasets import make_classification
from sklearn.model_selection import train_test_split
from sklearn.neighbors import KNeighborsClassifier
from sklearn.metrics import accuracy_score, precision_score, recall_score

# Step 2: Create a Simulated Dataset (Student Performance Example)
# Features: Hours_Studied, Attendance, GPA
# Target: Pass/Fail (0 = Fail, 1 = Pass)
X, y = make_classification(n_samples=200, n_features=3, 
                           n_informative=3, n_redundant=0, 
                           n_classes=2, random_state=42)

df = pd.DataFrame(X, columns=['Hours_Studied', 'Attendance', 'GPA'])
df['Pass_Fail'] = y

print("Sample of dataset:")
print(df.head())

# Step 3: Split Data into Training and Testing Sets
X_train, X_test, y_train, y_test = train_test_split(
    df[['Hours_Studied', 'Attendance', 'GPA']], 
    df['Pass_Fail'], 
    test_size=0.3, 
    random_state=42
)

# Step 4: Train KNN Model (with k=3)
knn = KNeighborsClassifier(n_neighbors=3)
knn.fit(X_train, y_train)

# Step 5: Make Predictions
y_pred = knn.predict(X_test)

# Step 6: Evaluate Model Performance
print("\nModel Performance with k=3")
print("Accuracy:", accuracy_score(y_test, y_pred))
print("Precision:", precision_score(y_test, y_pred))
print("Recall:", recall_score(y_test, y_pred))

# Step 7: Tune Hyperparameter 'k'
print("\nHyperparameter Tuning Results:")
for k in [1, 3, 5, 7, 9]:
    knn = KNeighborsClassifier(n_neighbors=k)
    knn.fit(X_train, y_train)
    y_pred = knn.predict(X_test)
    print(f"k={k}: Accuracy={accuracy_score(y_test, y_pred)}, "
          f"Precision={precision_score(y_test, y_pred)}, "
          f"Recall={recall_score(y_test, y_pred)}")
