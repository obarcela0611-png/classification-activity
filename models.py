
from sklearn.pipeline import make_pipeline
from sklearn.dummy import DummyClassifier
from sklearn.impute import SimpleImputer
from sklearn.preprocessing import StandardScaler
from sklearn.linear_model import LogisticRegression
from sklearn.neighbors import KNeighborsClassifier
from sklearn.ensemble import RandomForestClassifier
from lightgbm import LGBMClassifier

from analysis.data import encode


def baseline():
    return make_pipeline(
        DummyClassifier(strategy="prior")
    )


def logreg():
    return make_pipeline(
        encode(),
        SimpleImputer(strategy="median"),
        StandardScaler(),
        LogisticRegression(max_iter=5000)
    )


def knn():
    return make_pipeline(
        encode(),
        SimpleImputer(strategy="median"),
        StandardScaler(),
        KNeighborsClassifier(n_neighbors=25)
    )


def rf():
    return make_pipeline(
        encode(),
        SimpleImputer(strategy="median"),
        RandomForestClassifier(
            n_estimators=300,
            min_samples_leaf=3,
            random_state=0,
            n_jobs=-1
        )
    )


def lgbm():
    return make_pipeline(
        encode(),
        LGBMClassifier(
            random_state=0,
            verbose=-1,
            n_jobs=8
        )
    )


MODELS = {
    "baseline": baseline,
    "logreg": logreg,
    "knn": knn,
    "rf": rf,
    "lgbm": lgbm
}
