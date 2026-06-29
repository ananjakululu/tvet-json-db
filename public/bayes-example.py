import numpy as np
from sklearn.naive_bayes import CategoricalNB

# -------------------------------
# Step 1: Define dataset
# -------------------------------
# Encode categories: 0 = Football, 1 = Basketball
X = np.array([[0]]*30 + [[1]]*70)

# Labels: 1 = Pass, 0 = Fail
y = np.array(
    [1]*24 + [0]*6 +   # Football: 80% pass → 24 pass, 6 fail
    [1]*42 + [0]*28    # Basketball: 60% pass → 42 pass, 28 fail
)

# -------------------------------
# Step 2: Train Naive Bayes model
# -------------------------------
model = CategoricalNB()
model.fit(X, y)

# -------------------------------
# Step 3: Posterior probability
# -------------------------------
# Probability of football given pass
# Bayes theorem manually
P_F, P_B = 0.30, 0.70
P_pass_F, P_pass_B = 0.80, 0.60

P_pass = (P_pass_F * P_F) + (P_pass_B * P_B)
posterior_F_given_pass = (P_pass_F * P_F) / P_pass
print("Bayes theorem: P(Football | Pass) =", posterior_F_given_pass)

# Model-based probability (predict_proba for Football category)
prob_pass_given_football = model.predict_proba([[0]])[0][1]
print("Model: P(Pass | Football) =", prob_pass_given_football)
