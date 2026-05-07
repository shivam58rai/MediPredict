# MediPredict

MediPredict is a machine learning based disease prediction web application that predicts possible diseases from user-selected symptoms. The project uses a Random Forest model with a Flask backend and a responsive frontend interface.

---

## Features

- Disease prediction using symptoms
- Random Forest machine learning model
- Top 3 disease predictions
- Confidence score display
- Responsive user interface
- Flask REST API

---
## Live Demo

🔗 [MediPredict Live App](https://medipredict-o92q.onrender.com/)


## Tech Stack

### Frontend
- HTML
- CSS
- JavaScript

### Backend
- Python
- Flask
- Flask-CORS

### Machine Learning
- Scikit-learn
- Pandas
- NumPy

### Deployment
- GitHub
- Render

---

## Project Structure

```bash
Disease prediction/
│
├── backend
│   ├── app.py
│   ├── dataset.csv
│   ├── model.pkl
│   ├── encoder.pkl
│   ├── train_model.py
│   ├── requirements.txt
│   └── Procfile
│
├── frontend
│   ├── index.html
│   ├── style.css
│   └── script.js
│
└── .gitignore
