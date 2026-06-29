# Naïve Bayes Beginner Example (Fixed)
import pandas as pd
from sklearn.model_selection import train_test_split
from sklearn.naive_bayes import GaussianNB

# Tiny dataset: student names, hours studied, and pass/fail outcome
data = {
    'student':       ['Alice','Brian','Cathy','David'],
    'hours_studied': [2, 4, 6, 8],
    'passed':        [0, 0, 1, 1]  # 1=Pass, 0=Fail
}
df = pd.DataFrame(data)

# Features (X) and target (y)
X = df[['hours_studied']]
y = df['passed']

# Split into training and testing sets
X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.5, random_state=42)

# Train Naïve Bayes model
model = GaussianNB()
model.fit(X_train, y_train)

# Predictions
y_pred = model.predict(X_test)

# Build results table with proper alignment
results = pd.DataFrame({
    'Student': df.loc[X_test.index, 'student'].values,
    'Hours Studied': X_test['hours_studied'].values,
    'Actual': y_test.map({0:'Fail', 1:'Pass'}).values,
    'Predicted': pd.Series(y_pred).map({0:'Fail', 1:'Pass'}).values
})

print("🔎 Prediction Results:")
print(results.to_string(index=False))
