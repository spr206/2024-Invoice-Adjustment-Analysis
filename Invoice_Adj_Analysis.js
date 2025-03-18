import React, { useState, useEffect } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, LineChart, Line } from 'recharts';

const FinancialAdjustmentAnalysis = () => {
  const [data, setData] = useState([]);
  const [distributionData, setDistributionData] = useState([]);
  const [cumulativeData, setCumulativeData] = useState([]);
  const [stats, setStats] = useState({});
  const [loadingError, setLoadingError] = useState(null);

  useEffect(() => {
    const processData = async () => {
      try {
        // Read the financial adjustment data
        const response = await window.fs.readFile('paste.txt', { encoding: 'utf8' });
        const lines = response.split('\n').filter(line => line.trim() !== '');
        
        // Parse the data
        const allValues = [];
        for (let line of lines) {
          if (line.includes('avg') || !line.trim()) continue;
          
          const parts = line.split('\t').filter(p => p.trim() !== '');
          
          // Process left side (A column values)
          if (parts.length >= 2) {
            const category = parts[0].trim();
            const valueStr = parts[1].trim();
            const value = parseFloat(valueStr.replace(/,/g, ''));
            if (!isNaN(value)) {
              allValues.push({ category, value });
            }
          }
          
          // Process right side (C column values) if they exist
          if (parts.length >= 4) {
            const category = parts[2].trim();
            const valueStr = parts[3].trim();
            const value = parseFloat(valueStr.replace(/,/g, ''));
            if (!isNaN(value)) {
              allValues.push({ category, value });
            }
          }
        }
        
        setData(allValues);
        
        // Calculate key statistics
        const values = allValues.map(item => item.value);
        const sortedValues = [...values].sort((a, b) => a - b);
        
        const sum = values.reduce((a, b) => a + b, 0);
        const mean = sum / values.length;
        
        const median = sortedValues.length % 2 === 0 
          ? (sortedValues[sortedValues.length/2 - 1] + sortedValues[sortedValues.length/2]) / 2 
          : sortedValues[Math.floor(sortedValues.length/2)];
        
        const squaredDiffs = values.map(value => Math.pow(value - mean, 2));
        const variance = squaredDiffs.reduce((a, b) => a + b, 0) / values.length;
        const stdDev = Math.sqrt(variance);
        
        const getPercentile = (arr, p) => {
          const index = Math.ceil(arr.length * p) - 1;
          return arr[index];
        };
        
        const p90 = getPercentile(sortedValues, 0.90);
        const p95 = getPercentile(sortedValues, 0.95);
        const p99 = getPercentile(sortedValues, 0.99);
        
        setStats({
          count: values.length,
          mean: mean,
          median: median,
          stdDev: stdDev,
          min: sortedValues[0],
          max: sortedValues[sortedValues.length - 1],
          p90: p90,
          p95: p95,
          p99: p99
        });
        
        // Create distribution data for visualization
        const buckets = [
          { range: "$0-$1K", min: 0, max: 1000 },
          { range: "$1K-$2.5K", min: 1000, max: 2500 },
          { range: "$2.5K-$5K", min: 2500, max: 5000 },
          { range: "$5K-$7.5K", min: 5000, max: 7500 },
          { range: "$7.5K-$10K", min: 7500, max: 10000 },
          { range: "$10K-$15K", min: 10000, max: 15000 },
          { range: "$15K-$20K", min: 15000, max: 20000 },
          { range: "$20K-$30K", min: 20000, max: 30000 },
          { range: "$30K-$50K", min: 30000, max: 50000 },
          { range: "$50K+", min: 50000, max: Infinity }
        ];
        
        const distData = buckets.map(bucket => {
          const count = allValues.filter(item => 
            item.value >= bucket.min && item.value < bucket.max
          ).length;
          const percentage = (count / allValues.length) * 100;
          return {
            range: bucket.range,
            count: count,
            percentage: percentage.toFixed(1)
          };
        });
        
        setDistributionData(distData);
        
        // Create cumulative data
        const thresholds = [
          1000, 2500, 5000, 7500, 10000, 15000, 20000, 25000, 30000, 40000, 50000
        ];
        
        const cumData = thresholds.map(threshold => {
          const belowCount = allValues.filter(v => v.value <= threshold).length;
          const percentage = (belowCount / allValues.length) * 100;
          return {
            threshold: threshold,
            label: '$' + threshold.toLocaleString(),
            count: belowCount,
            percentage: percentage.toFixed(1)
          };
        });
        
        setCumulativeData(cumData);
        
      } catch (error) {
        console.error('Error processing data:', error);
        setLoadingError('Failed to load and process the data');
      }
    };
    
    processData();
  }, []);

  if (loadingError) {
    return <div className="text-red-500">Error: {loadingError}</div>;
  }
  
  if (distributionData.length === 0) {
    return <div className="text-gray-600">Loading financial adjustment data...</div>;
  }

  const formatCurrency = (num) => {
    return '$' + num.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  };
  
  const recommendedThresholds = [
    { level: "Conservative", value: 5000, coverage: cumulativeData.find(d => d.threshold === 5000)?.percentage || "85.6" },
    { level: "Moderate", value: 10000, coverage: cumulativeData.find(d => d.threshold === 10000)?.percentage || "92.2" },
    { level: "Liberal", value: 20000, coverage: cumulativeData.find(d => d.threshold === 20000)?.percentage || "96.4" }
  ];

  return (
    <div className="p-4">
      <h1 className="text-2xl font-bold mb-4">Financial Adjustment Analysis</h1>
      
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        <div className="p-4 border rounded shadow">
          <h2 className="text-xl font-semibold mb-3">Key Statistics</h2>
          <div className="grid grid-cols-2 gap-2">
            <div>Total Adjustments:</div>
            <div className="font-semibold text-right">{stats.count}</div>
            
            <div>Mean:</div>
            <div className="font-semibold text-right">{formatCurrency(stats.mean)}</div>
            
            <div>Median:</div>
            <div className="font-semibold text-right">{formatCurrency(stats.median)}</div>
            
            <div>Standard Deviation:</div>
            <div className="font-semibold text-right">{formatCurrency(stats.stdDev)}</div>
            
            <div>Minimum:</div>
            <div className="font-semibold text-right">{formatCurrency(stats.min)}</div>
            
            <div>Maximum:</div>
            <div className="font-semibold text-right">{formatCurrency(stats.max)}</div>
            
            <div>90th Percentile:</div>
            <div className="font-semibold text-right">{formatCurrency(stats.p90)}</div>
            
            <div>95th Percentile:</div>
            <div className="font-semibold text-right">{formatCurrency(stats.p95)}</div>
            
            <div>99th Percentile:</div>
            <div className="font-semibold text-right">{formatCurrency(stats.p99)}</div>
          </div>
        </div>
        
        <div className="p-4 border rounded shadow">
          <h2 className="text-xl font-semibold mb-3">Recommended Ceiling Options</h2>
          <div className="space-y-4">
            {recommendedThresholds.map((threshold, index) => (
              <div key={index} className="p-3 border rounded">
                <div className="flex justify-between">
                  <span className="font-semibold">{threshold.level} Threshold:</span>
                  <span className="font-bold">{formatCurrency(threshold.value)}</span>
                </div>
                <div className="mt-1 text-gray-600">
                  Covers {threshold.coverage}% of all adjustments
                </div>
                <div className="mt-2 text-sm">
                  {index === 0 ? "Most restrictive option, requires manual approval for more cases" : 
                   index === 1 ? "Balanced option, good coverage while limiting risk exposure" :
                   "Most permissive option, minimizes manual approvals"}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
      
      <div className="mb-8">
        <h2 className="text-xl font-semibold mb-3">Distribution of Financial Adjustments</h2>
        <div className="h-64">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              data={distributionData}
              margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
            >
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="range" />
              <YAxis yAxisId="left" orientation="left" />
              <YAxis yAxisId="right" orientation="right" />
              <Tooltip formatter={(value, name) => [
                name === 'count' ? value : value + '%', 
                name === 'count' ? 'Count' : 'Percentage'
              ]} />
              <Legend />
              <Bar yAxisId="left" dataKey="count" fill="#4f46e5" name="Count" />
              <Bar yAxisId="right" dataKey="percentage" fill="#16a34a" name="Percentage" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
      
      <div className="mb-8">
        <h2 className="text-xl font-semibold mb-3">Cumulative Coverage by Threshold</h2>
        <div className="h-64">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart
              data={cumulativeData}
              margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
            >
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="label" />
              <YAxis domain={[0, 100]} />
              <Tooltip formatter={(value) => [`${value}%`, 'Coverage']} />
              <Legend />
              <Line type="monotone" dataKey="percentage" stroke="#0f766e" name="Coverage %" strokeWidth={2} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>
      
      <div className="p-4 border rounded shadow bg-amber-50">
        <h2 className="text-xl font-semibold mb-3">Analysis and Recommendation</h2>
        <p className="mb-2">
          Based on the analysis of {stats.count} financial adjustments from 2024:
        </p>
        <ul className="list-disc pl-5 mb-3 space-y-1">
          <li>The majority of adjustments (over 53%) are under $1,000</li>
          <li>90% of all adjustments are under $7,500</li>
          <li>There's a significant jump in values after $20,000 (only 3.6% of adjustments)</li>
          <li>The data is highly skewed with outliers above $50,000 (1.4% of cases)</li>
        </ul>
        <p className="font-semibold">
          Recommended ceiling: $10,000
        </p>
        <p className="mt-1">
          This threshold would cover 92.2% of all adjustments, balancing efficiency (minimal manual reviews) 
          with risk management (controlling exposure to large adjustments).
        </p>
      </div>
    </div>
  );
};

export default FinancialAdjustmentAnalysis;