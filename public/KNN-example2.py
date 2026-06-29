# Step 1: Import libraries
import numpy as np
import matplotlib.pyplot as plt
from sklearn.model_selection import train_test_split
from sklearn.neighbors import KNeighborsClassifier

# Step 2: Create dataset (AI, C++ scores for Bushiangala TTI students)
X = np.array([
    [80, 75], [60, 65], [90, 85], [50, 45], [40, 55],
    [70, 60], [85, 95], [30, 40], [55, 50], [95, 90]
])

# Labels: 1 = Pass, 0 = Fail
y = np.array([1,1,1,0,0,1,1,0,0,1])

# Step 3: Split into training and testing sets
X_train, X_test, y_train, y_test = train_test_split(
    X, y, test_size=0.3, random_state=69
)

# Step 4: Train and evaluate KNN with different K values
print("Bushiangala TTI - Accuracy with different K values:")
for k in [1, 3, 5, 7]:
    knn = KNeighborsClassifier(n_neighbors=k)
    knn.fit(X_train, y_train)
    acc = knn.score(X_test, y_test)
    print(f"K={k}, Accuracy={acc:.2f}")

# Step 5: Predict new student outcome
new_student = np.array([[45, 40]])  # AI=65, C++=70
prediction = knn.predict(new_student)
print("Prediction for new Bushiangala TTI student (1=Pass, 0=Fail):", prediction)

# Step 6: Visualize results
for i, label in enumerate(y_train):
    if label == 1:
        plt.scatter(X_train[i,0], X_train[i,1], color='green', label='Pass' if i==0 else "")
    else:
        plt.scatter(X_train[i,0], X_train[i,1], color='red', label='Fail' if i==0 else "")

# Plot new student
plt.scatter(new_student[0,0], new_student[0,1], color='blue', marker='x', s=100, label='New Student')

plt.xlabel("Artificial Intelligence Score")
plt.ylabel("Programming with C++ Score")
plt.title("Bushiangala TTI - KNN Classification of Student Performance")
plt.legend()
plt.show()
