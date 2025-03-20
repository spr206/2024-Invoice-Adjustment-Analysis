import pandas as pd
import numpy as np
import matplotlib.pyplot as plt
from collections import defaultdict

# Function to parse the data file
def parse_financial_adjustments(file_path):
    data = []
    
    with open(file_path, 'r') as file:
        lines = file.readlines()
    
    for line in lines:
        if 'avg' in line or not line.strip():
            continue
        
        parts = [p.strip() for p in line.split('\t') if p.strip()]
        
        # Process left side (A column values)
        if len(parts) >= 2:
            category = parts[0]
            value_str = parts[1]
            try:
                value = float(value_str.replace(',', ''))
                data.append({'category': category, 'value': value})
            except ValueError:
                pass
        
        # Process right side (C column values) if they exist
        if len(parts) >= 4:
            category = parts[2]
            value_str = parts[3]
            try:
                value = float(value_str.replace(',', ''))
                data.append({'category': category, 'value': value})
            except ValueError:
                pass
                
    return pd.DataFrame(data)

# Load and analyze the data
def analyze_financial_adjustments(file_path):
    # Load data
    df = parse_financial_adjustments(file_path)
    
    # Basic statistics
    stats = {
        'count': len(df),
        'mean': df['value'].mean(),
        'median': df['value'].median(),
        'std_dev': df['value'].std(),
        'min': df['value'].min(),
        'max': df['value'].max(),
        'p75': df['value'].quantile(0.75),
        'p90': df['value'].quantile(0.90),
        'p95': df['value'].quantile(0.95),
        'p99': df['value'].quantile(0.99)
    }
    
    # Distribution analysis
    bucket_ranges = [
        (0, 1000, "$0-$1,000"), 
        (1000, 2500, "$1,000-$2,500"),
        (2500, 5000, "$2,500-$5,000"),
        (5000, 7500, "$5,000-$7,500"),
        (7500, 10000, "$7,500-$10,000"),
        (10000, 15000, "$10,000-$15,000"),
        (15000, 20000, "$15,000-$20,000"),
        (20000, 30000, "$20,000-$30,000"), 
        (30000, 50000, "$30,000-$50,000"),
        (50000, float('inf'), "$50,000+")
    ]
    
    distribution = []
    for min_val, max_val, label in bucket_ranges:
        count = ((df['value'] >= min_val) & (df['value'] < max_val)).sum()
        percentage = (count / len(df)) * 100
        distribution.append({
            'range': label,
            'count': count,
            'percentage': percentage
        })
    
    # Threshold analysis
    thresholds = [1000, 2500, 5000, 7500, 10000, 15000, 20000, 25000, 30000, 40000, 50000]
    threshold_analysis = []
    
    for threshold in thresholds:
        below_count = (df['value'] <= threshold).sum()
        percentage = (below_count / len(df)) * 100
        threshold_analysis.append({
            'threshold': threshold,
            'count_below': below_count,
            'percentage_below': percentage
        })
    
    # Category analysis
    category_stats = df.groupby('category').agg({
        'value': ['count', 'mean', 'median', 'max']
    }).reset_index()
    
    # Filter to categories with at least 5 entries
    category_stats = category_stats[category_stats[('value', 'count')] >= 5]
    
    # Natural breaks analysis
    # Sort values and calculate gaps between consecutive values
    sorted_values = df['value'].sort_values().values
    gaps = []
    
    # Look at top 50 values
    top_values = sorted_values[-50:]
    for i in range(1, len(top_values)):
        gap = top_values[i] - top_values[i-1]
        gap_percentage = (gap / top_values[i-1]) * 100
        
        if gap_percentage > 15:  # Significant gap
            gaps.append({
                'lower_value': top_values[i-1],
                'upper_value': top_values[i],
                'gap': gap,
                'gap_percentage': gap_percentage
            })
    
    # Sort gaps by percentage (descending)
    gaps = sorted(gaps, key=lambda x: x['gap_percentage'], reverse=True)
    
    # Recommended thresholds
    recommended = [
        {'level': 'Conservative', 'value': 5000},
        {'level': 'Moderate', 'value': 10000},
        {'level': 'Liberal', 'value': 20000}
    ]
    
    for rec in recommended:
        threshold = rec['value']
        rec['coverage'] = (df['value'] <= threshold).mean() * 100
    
    return {
        'stats': stats,
        'distribution': distribution,
        'threshold_analysis': threshold_analysis,
        'category_stats': category_stats,
        'gaps': gaps,
        'recommended': recommended
    }

# Display the results
def display_results(results):
    # Basic statistics
    print("=== FINANCIAL ADJUSTMENT ANALYSIS ===")
    print(f"Total number of adjustments: {results['stats']['count']}")
    print(f"Mean: ${results['stats']['mean']:.2f}")
    print(f"Median: ${results['stats']['median']:.2f}")
    print(f"Standard Deviation: ${results['stats']['std_dev']:.2f}")
    print(f"Minimum: ${results['stats']['min']:.2f}")
    print(f"Maximum: ${results['stats']['max']:.2f}")
    print(f"75th Percentile: ${results['stats']['p75']:.2f}")
    print(f"90th Percentile: ${results['stats']['p90']:.2f}")
    print(f"95th Percentile: ${results['stats']['p95']:.2f}")
    print(f"99th Percentile: ${results['stats']['p99']:.2f}")
    
    # Distribution
    print("\n=== DISTRIBUTION ANALYSIS ===")
    for bucket in results['distribution']:
        print(f"{bucket['range']}: {bucket['count']} adjustments ({bucket['percentage']:.2f}%)")
    
    # Cumulative analysis
    print("\n=== CUMULATIVE THRESHOLD ANALYSIS ===")
    for threshold in results['threshold_analysis']:
        print(f"${threshold['threshold']}: {threshold['count_below']} adjustments below ({threshold['percentage_below']:.2f}%)")
    
    # Natural breaks
    print("\n=== SIGNIFICANT GAPS IN DATA ===")
    for i, gap in enumerate(results['gaps'][:5]):  # Top 5 gaps
        print(f"Gap between ${gap['lower_value']:.2f} and ${gap['upper_value']:.2f}: ${gap['gap']:.2f} ({gap['gap_percentage']:.2f}%)")
    
    # Recommendations
    print("\n=== RECOMMENDED THRESHOLDS ===")
    for rec in results['recommended']:
        print(f"{rec['level']} threshold: ${rec['value']} (covers {rec['coverage']:.2f}% of adjustments)")
    
    print("\n=== RECOMMENDATION ===")
    print("Based on the analysis, a ceiling of $xx,xxx is recommended.")
    print("This threshold would cover approximately x% of all adjustments,")

# Optional: Create simple visualization
def plot_distribution(results):
    # Extract data for plotting
    ranges = [d['range'] for d in results['distribution']]
    counts = [d['count'] for d in results['distribution']]
    
    plt.figure(figsize=(12, 6))
    plt.bar(ranges, counts)
    plt.title('Distribution of Financial Adjustments')
    plt.xlabel('Amount Range')
    plt.ylabel('Number of Adjustments')
    plt.xticks(rotation=45)
    plt.tight_layout()
    plt.savefig('financial_adjustments_distribution.png')
    
    # Cumulative percentage plot
    thresholds = [t['threshold'] for t in results['threshold_analysis']]
    percentages = [t['percentage_below'] for t in results['threshold_analysis']]
    
    plt.figure(figsize=(12, 6))
    plt.plot(thresholds, percentages, marker='o')
    plt.title('Cumulative Percentage of Adjustments Below Threshold')
    plt.xlabel('Threshold Amount ($)')
    plt.ylabel('Percentage of Adjustments Below')
    plt.grid(True)
    plt.tight_layout()
    plt.savefig('financial_adjustments_cumulative.png')

# Main execution
if __name__ == "__main__":
    file_path = "data.txt"  # Replace with your file path
    results = analyze_financial_adjustments(file_path)
    display_results(results)
    plot_distribution(results)  # Optional visualization