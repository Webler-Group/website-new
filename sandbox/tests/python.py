import numpy as np, pandas as pd, scipy.linalg, matplotlib.pyplot as plt
from PIL import Image
name = input()
a = np.array([[2.0, 1.0], [1.0, 3.0]])
print(f"hello {name}", np.round(scipy.linalg.det(a), 3), pd.Series([1, 2, 3]).sum())
plt.plot([1, 2, 3]); plt.savefig("output/plot.png")
