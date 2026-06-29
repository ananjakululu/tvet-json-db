import numpy as np
import matplotlib.pyplot as plt
from sklearn.naive_bayes import CategoricalNB

# -------------------------------
# Example vote counts per region
# Regions: Western, Nyanza, Coast, Central
# Candidates: Pendo, Amani, Bahati, Luck, Sura
votes = {
    "Western": [120, 80, 60, 40, 30],
    "Nyanza": [90, 110, 70, 50, 40],
    "Coast": [100, 95, 85, 60, 55],
    "Central": [130, 70, 60, 50, 40]
}

# -------------------------------
# Prepare dataset for Naive Bayes
X = []
y = []

# Encode candidates as 0–4
for region, counts in votes.items():
    for candidate_id, count in enumerate(counts):
        # Add 'count' samples for each candidate
        X.extend([[candidate_id]] * count)
        # Label is candidate_id itself (multi-class classification)
        y.extend([candidate_id] * count)

X = np.array(X)
y = np.array(y)

# -------------------------------
# Train Naive Bayes model
model = CategoricalNB()
model.fit(X, y)

# Posterior probability of each candidate
candidates = ["Pendo", "Amani", "Bahati", "Luck", "Sura"]
for candidate_id, candidate in enumerate(candidates):
    prob = model.predict_proba([[candidate_id]])[0][candidate_id]
    print(f"Candidate {candidate}: P(Class={candidate}) = {prob:.2f}")

# -------------------------------
# Plot bar chart of total votes
total_votes = [sum(votes[region][i] for region in votes) for i in range(5)]

plt.bar(candidates, total_votes, color=['blue','green','red','purple','orange'])
plt.xlabel("Candidates")
plt.ylabel("Total Votes")
plt.title("Election Results by Candidate (Data by Alex & Co.)")
plt.show()

# -------------------------------
# Plot stacked bar chart per region
region_names = list(votes.keys())
vote_matrix = np.array(list(votes.values()))

fig, ax = plt.subplots()
bottom = np.zeros(len(region_names))
for i, candidate in enumerate(candidates):
    ax.bar(region_names, vote_matrix[:, i], bottom=bottom, label=f"Candidate {candidate}")
    bottom += vote_matrix[:, i]

ax.set_ylabel("Votes")
ax.set_title("Votes per Region by Candidate")
ax.legend()
plt.show()
