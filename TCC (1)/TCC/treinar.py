import pandas as pd
import joblib

from sklearn.preprocessing import LabelEncoder
from sklearn.model_selection import train_test_split
from sklearn.tree import DecisionTreeClassifier
from sklearn.metrics import accuracy_score, classification_report, confusion_matrix


# ==========================================
# 1 - CARREGAR O DATASET
# ==========================================

dados = pd.read_csv("nutricao.csv")

print("Dados Carregados:")
print(dados)


# ==========================================
# 2 - CRIAR OS CODIFICADORES
# ==========================================

encoder_objetivo = LabelEncoder()
encoder_qualidade = LabelEncoder()
encoder_resultado = LabelEncoder()


# ==========================================
# 3 - TRANSFORMAR TEXTOS EM NÚMEROS
# ==========================================

dados["objetivo"] = encoder_objetivo.fit_transform(
    dados["objetivo"]
)

dados["qualidade_alimentacao"] = encoder_qualidade.fit_transform(
    dados["qualidade_alimentacao"]
)

dados["resultado"] = encoder_resultado.fit_transform(
    dados["resultado"]
)


# ==========================================
# 4 - SEPARAR ENTRADAS E RESULTADO
# ==========================================

X = dados[
    [
        "idade",
        "peso",
        "altura",
        "atividade",
        "objetivo",
        "calorias",
        "proteina",
        "carboidratos",
        "gorduras",
        "agua",
        "quantidade_refeicoes",
        "qualidade_alimentacao"
    ]
]

y = dados["resultado"]


# ==========================================
# 5 - SEPARAR TREINAMENTO E TESTE
# ==========================================

X_treino, X_teste, y_treino, y_teste = train_test_split(
    X,
    y,
    test_size=0.25,
    random_state=42
)


# ==========================================
# 6 - CRIAR O MODELO DE IA
# ==========================================

modelo = DecisionTreeClassifier(
    random_state=42
)


# ==========================================
# 7 - TREINAR A IA
# ==========================================

modelo.fit(X_treino, y_treino)

print("\nModelo treinado com sucesso!!")


# ==========================================
# 8 - TESTAR A IA
# ==========================================

previsoes = modelo.predict(X_teste)

precisao = accuracy_score(
    y_teste,
    previsoes
)

print(f"\nPrecisão do modelo: {precisao * 100:.2f}%")


# ==========================================
# 9 - RELATÓRIO DE CLASSIFICAÇÃO
# ==========================================

print("\nRelatório de classificação:")

print(
    classification_report(
        y_teste,
        previsoes,
        target_names=encoder_resultado.classes_,
        zero_division=0
    )
)


# ==========================================
# 10 - MATRIZ DE CONFUSÃO
# ==========================================

print("\nMatriz de confusão:")

print(
    confusion_matrix(
        y_teste,
        previsoes
    )
)


# ==========================================
# 11 - TESTAR UM NOVO USUÁRIO
# ==========================================

novo_usuario = pd.DataFrame([
    {
        "idade": 22,
        "peso": 70,
        "altura": 175,
        "atividade": 3,

        "objetivo": encoder_objetivo.transform(
            ["ganho_massa"]
        )[0],

        "calorias": 2500,
        "proteina": 140,
        "carboidratos": 300,
        "gorduras": 70,
        "agua": 2.5,
        "quantidade_refeicoes": 5,

        "qualidade_alimentacao": encoder_qualidade.transform(
            ["boa"]
        )[0]
    }
])


# ==========================================
# 12 - FAZER A PREVISÃO
# ==========================================

resultado = modelo.predict(novo_usuario)


# ==========================================
# 13 - TRANSFORMAR O RESULTADO EM TEXTO
# ==========================================

resultado_texto = encoder_resultado.inverse_transform(
    resultado
)

print("\nResultado para o novo usuário:")
print(resultado_texto[0])


# ==========================================
# 14 - SALVAR O MODELO
# ==========================================

joblib.dump(
    modelo,
    "modelo_nutricao.pkl"
)

joblib.dump(
    encoder_objetivo,
    "encoder_objetivo.pkl"
)

joblib.dump(
    encoder_qualidade,
    "encoder_qualidade.pkl"
)

joblib.dump(
    encoder_resultado,
    "encoder_resultado.pkl"
)

print("\nModelo salvo com sucesso!!")


# ==========================================
# 15 - MOSTRAR OS PRIMEIROS DADOS
# ==========================================

print("\nPrimeiros registros utilizados:")

print(dados.head())