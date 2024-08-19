---
title:          Towards Realistic Long-tailed Semi-supervised Learning in an Open World
date:           2024-05-23 00:10:00 +0800
selected:       false
pub:            "arXiv"
pub_last:       ' <span class="badge badge-pill badge-info">Preprint</span>'
pub_date:       "2024"

abstract: >-
  Open-world long-tailed semi-supervised learning (OLSSL) has increasingly attracted attention. However, existing OLSSL algorithms generally assume that the distributions between known and novel categories are nearly identical. Against this backdrop, we construct a more \emph{Realistic Open-world Long-tailed Semi-supervised Learning} (\textbf{ROLSSL}) setting where there is no premise on the distribution relationships between known and novel categories. Furthermore, even within the known categories, the number of labeled samples is significantly smaller than that of the unlabeled samples, as acquiring valid annotations is often prohibitively costly in the real world. Under the proposed ROLSSL setting, we propose a simple yet potentially effective solution called dual-stage post-hoc logit adjustments. The proposed approach revisits the logit adjustment strategy by considering the relationships among the frequency of samples, the total number of categories, and the overall size of data. Then, it estimates the distribution of unlabeled data for both known and novel categories to dynamically readjust the corresponding predictive probabilities, effectively mitigating category bias during the learning of known and novel classes with more selective utilization of imbalanced unlabeled data. Extensive experiments on datasets such as CIFAR100 and ImageNet100 have demonstrated performance improvements of up to 50.1\%, validating the superiority of our proposed method and establishing a strong baseline for this task. For further researches, the anonymous link to the experimental code is at \href{this https URL}{\textcolor{brightpink}{this https URL}}
  
cover:   
authors:       
  - Yuanpeng He
  - Lijian Li
links:
  Preprint: https://arxiv.org/abs/2405.14516 
  # Code:  https://github.com/heyuanpengpku/GUEF
  # Unsplash: https://unsplash.com/photos/sliced-in-half-pineapple--_PLJZmHZzk
---
