# Step 1: Import libraries
from sklearn.datasets import load_iris
from sklearn.model_selection import train_test_split
from sklearn.neighbors import KNeighborsClassifier
import matplotlib.pyplot as plt
from matplotlib.colors import ListedColormap
import numpy as np

# Step 2: Load and explore dataset
iris = load_iris()
X, y = iris.data, iris.target

print("Feature names:", iris.feature_names)
print("Target names:", iris.target_names)
print("First 5 samples:\n", X[:5])

# Step 3: Split into training and testing sets
X_train, X_test, y_train, y_test = train_test_split(
    X, y, test_size=0.3, random_state=42
)

# Step 4: Train and evaluate KNN with different K values
print("\nAccuracy with different K values:")
for k in [1, 3, 5, 7, 9]:
    knn = KNeighborsClassifier(n_neighbors=k)
    knn.fit(X_train, y_train)
    acc = knn.score(X_test, y_test)
    print(f"K={k}, Accuracy={acc:.2f}")

# Step 5: Visualization of decision boundaries (using 2 features)
X_vis = X[:, :2]  # sepal length & sepal width
X_train, X_test, y_train, y_test = train_test_split(
    X_vis, y, test_size=0.3, random_state=42
)

knn = KNeighborsClassifier(n_neighbors=5)
knn.fit(X_train, y_train)

# Create mesh grid
x_min, x_max = X_vis[:, 0].min() - 1, X_vis[:, 0].max() + 1
y_min, y_max = X_vis[:, 1].min() - 1, X_vis[:, 1].max() + 1
xx, yy = np.meshgrid(
    np.arange(x_min, x_max, 0.1),
    np.arange(y_min, y_max, 0.1)
)

# Predict classes for each grid point
Z = knn.predict(np.c_[xx.ravel(), yy.ravel()])
Z = Z.reshape(xx.shape)

# Plot decision boundary
plt.contourf(xx, yy, Z, alpha=0.3, cmap=ListedColormap(('red','green','blue')))
plt.scatter(X_vis[:, 0], X_vis[:, 1], c=y, edgecolor='k',
            cmap=ListedColormap(('red','green','blue')))
plt.xlabel('Sepal length')
plt.ylabel('Sepal width')
plt.title('KNN Decision Boundary (K=5)')
plt.show()
