import numpy as np
from sklearn.naive_bayes import CategoricalNB

# Encode streams: 0 = Science, 1 = Arts
X = np.array([[0]]*40 + [[1]]*60)

# Labels: 1 = Pass, 0 = Fail
y = np.array(
    [1]*34 + [0]*6 +   # Science: 85% pass → 34 pass, 6 fail
    [1]*30 + [0]*30    # Arts: 50% pass → 30 pass, 30 fail
)

# Train Naive Bayes model
model = CategoricalNB()
model.fit(X, y)

# Bayes theorem manually
P_S, P_A = 0.40, 0.60
P_pass_S, P_pass_A = 0.85, 0.50
P_pass = (P_pass_S * P_S) + (P_pass_A * P_A)
posterior_S_given_pass = (P_pass_S * P_S) / P_pass
print("Bayes theorem: P(Science | Pass) =", posterior_S_given_pass)

# Model-based probability
prob_pass_given_science = model.predict_proba([[0]])[0][1]
print("Model: P(Pass | Science) =", prob_pass_given_science)
