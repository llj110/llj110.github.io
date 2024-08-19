---
title:          Mutual Evidential Deep Learning for Semi-supervised Medical Image Segmentation
date:           2024-04-03 00:10:00 +0800
selected:       true
pub:            "IEEE International Conference on Bioinformatics and Biomedicine 2024 (IEEE BIBM 2024)"
pub_last:       ' <span class="badge badge-pill badge-custom badge-warning">CCF B</span> <span class="badge badge-pill badge-custom badge-primary">Regular Paper </span>'
pub_date:       "2024"

abstract: >-
  Existing semi-supervised medical segmentation co-learning frameworks have realized that model performance can be diminished by the biases in model recognition caused by low-quality pseudo-labels. Due to the averaging nature of their pseudo-label integration strategy, they fail to explore the reliability of pseudo-labels from different sources. In this paper, we propose a mutual evidential deep learning (MEDL) framework that offers a potentially viable solution for pseudo-label generation in semi-supervised learning from two perspectives. First, we introduce networks with different architectures to generate complementary evidence for unlabeled samples and adopt an improved class-aware evidential fusion to guide the confident synthesis of evidential predictions sourced from diverse architectural networks. Second, utilizing the uncertainty in the fused evidence, we design an asymptotic Fisher information-based evidential learning strategy. This strategy enables the model to initially focus on unlabeled samples with more reliable pseudo-labels, gradually shifting attention to samples with lower-quality pseudo-labels while avoiding over-penalization of mislabeled classes in high data uncertainty samples. Additionally, for labeled data, we continue to adopt an uncertainty-driven asymptotic learning strategy, gradually guiding the model to focus on challenging voxels. Extensive experiments on five mainstream datasets have demonstrated that MEDL achieves state-of-the-art performance.
cover:     assets/images/covers/2024-bibm-hyp.jpg
authors:    
  - Yuanpeng He
  - Yali Bi
  - Lijian Li
  - Chi-Man Pun
  - Wenpin Jiao
  - Zhi Jin
links:
  Paper: 
  # Code:  https://github.com/heyuanpengpku/GUEF
  # Unsplash: https://unsplash.com/photos/sliced-in-half-pineapple--_PLJZmHZzk
---
