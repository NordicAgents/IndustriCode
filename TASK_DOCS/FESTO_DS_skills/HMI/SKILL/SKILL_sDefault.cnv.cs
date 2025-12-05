/*
 * Created by EcoStruxure Automation Expert.
 * User: midxav
 * Date: 1/31/2024
 * Time: 11:06 AM
 * 
 */

using System;
using System.Globalization;
using NxtControl.GuiFramework;
using System.Windows.Forms;

namespace HMI.Main.Symbols.SKILL
{
	/// <summary>
	/// Description of sDefault.
	/// </summary>
	public partial class sDefault : NxtControl.GuiFramework.HMISymbol
	{
		public sDefault()
		{
			//
			// The InitializeComponent() call is required for Windows Forms designer support.
			//
			InitializeComponent();
		}


		void SetParametersClick(object sender, EventArgs e)
		{
			const short minimumAllowed = 0;
			const short maximumAllowed = 100;
			
			if (!TryParseWholeInput(this.IN1BOX.Text, out short in1))
			{
				MessageBox.Show("Enter a whole number between 0 and 100.", "Invalid input",
					MessageBoxButtons.OK, MessageBoxIcon.Warning);
				return;
			}
			
			if (in1 < minimumAllowed || in1 > maximumAllowed)
			{
				MessageBox.Show("Enter a number between 0 and 100.", "Invalid input",
					MessageBoxButtons.OK, MessageBoxIcon.Warning);
				return;
			}

			this.FireEvent_INPUT(in1);
		}

		static bool TryParseWholeInput(string text, out short value)
		{
			value = 0;
			
			if (string.IsNullOrWhiteSpace(text))
			{
				return false;
			}

			if (short.TryParse(text, NumberStyles.Integer, CultureInfo.InvariantCulture, out value) ||
			    short.TryParse(text, NumberStyles.Integer, CultureInfo.CurrentCulture, out value))
			{
				return true;
			}

			if (double.TryParse(text, NumberStyles.Float, CultureInfo.InvariantCulture, out double parsed) ||
			    double.TryParse(text, NumberStyles.Float, CultureInfo.CurrentCulture, out parsed))
			{
				double rounded = Math.Round(parsed);
				if (Math.Abs(parsed - rounded) < 0.000001 &&
				    rounded >= short.MinValue && rounded <= short.MaxValue)
				{
					value = (short)rounded;
					return true;
				}
			}

			return false;
		}

		void AbortClick(object sender, EventArgs e)
		{
			// TODO: Implement AbortClick
			this.FireEvent_SKILL_INPUT(9);
		}

		void HoldClick(object sender, EventArgs e)
		{
			// TODO: Implement HoldClick
			this.FireEvent_SKILL_INPUT(3);
		}

		void StartClick(object sender, EventArgs e)
		{
			// TODO: Implement StartClick
			this.FireEvent_SKILL_INPUT(1);
		}

		void SuspendClick(object sender, EventArgs e)
		{
			// TODO: Implement SuspendClick
			this.FireEvent_SKILL_INPUT(5);
		}

		void UnsuspendClick(object sender, EventArgs e)
		{
			// TODO: Implement UnsuspendClick
			this.FireEvent_SKILL_INPUT(6);
		}

		void ClearClick(object sender, EventArgs e)
		{
			// TODO: Implement ClearClick
			this.FireEvent_SKILL_INPUT(7);
		}

		void ResetClick(object sender, EventArgs e)
		{
			// TODO: Implement ResetClick
			this.FireEvent_SKILL_INPUT(2);
		}

		void StopClick(object sender, EventArgs e)
		{
			// TODO: Implement StopClick
			this.FireEvent_SKILL_INPUT(8);
		}

		void UnholdClick(object sender, EventArgs e)
		{
			// TODO: Implement UnholdClick
			this.FireEvent_SKILL_INPUT(4);
		}

		void ValueChange(object sender, ValueChangedEventArgs e)
		{
			// TODO: Implement ValueChange
			int val = int.Parse(this.CURRENT_STATE.Value.ToString());
			if (val == 1) {
				this.CurrentStateBox.Text = "IDLE";
				
				this.AbortButton.Enabled = false;
				this.HoldButton.Enabled =  false;
				this.StartButton.Enabled = true;	
				this.SuspendButton.Enabled = false;
				this.UnsuspendButton.Enabled = false;
				this.ClearButton.Enabled = false;
				this.ResetButton.Enabled = false;
				this.StopButton.Enabled = false;
				this.UnholdButton.Enabled = false;
			}
			else if (val == 2) {
				this.CurrentStateBox.Text = "STARTING";
				
				this.AbortButton.Enabled = false;
				this.HoldButton.Enabled =  false;
				this.StartButton.Enabled = false;	
				this.SuspendButton.Enabled = false;
				this.UnsuspendButton.Enabled = false;
				this.ClearButton.Enabled = false;
				this.ResetButton.Enabled = false;
				this.StopButton.Enabled = true;
				this.UnholdButton.Enabled = false;
			}
				
			else if (val == 3) {
				this.CurrentStateBox.Text = "EXECUTE";
				
				this.AbortButton.Enabled = true;
				this.HoldButton.Enabled =  true;
				this.StartButton.Enabled = false;	
				this.SuspendButton.Enabled = true;
				this.UnsuspendButton.Enabled = false;
				this.ClearButton.Enabled = false;
				this.ResetButton.Enabled = false;
				this.StopButton.Enabled = true;
				this.UnholdButton.Enabled = false;
			}
				
			else if (val == 4) {
				this.CurrentStateBox.Text = "COMPLETING";
				
				this.AbortButton.Enabled = false;
				this.HoldButton.Enabled =  false;
				this.StartButton.Enabled = false;	
				this.SuspendButton.Enabled = false;
				this.UnsuspendButton.Enabled = false;
				this.ClearButton.Enabled = false;
				this.ResetButton.Enabled = false;
				this.StopButton.Enabled = false;
				this.UnholdButton.Enabled = false;
			}
				
			else if (val == 5) {
				this.CurrentStateBox.Text = "COMPLETE";
				
				this.AbortButton.Enabled = false;
				this.HoldButton.Enabled =  false;
				this.StartButton.Enabled = false;	
				this.SuspendButton.Enabled = false;
				this.UnsuspendButton.Enabled = false;
				this.ClearButton.Enabled = false;
				this.ResetButton.Enabled = true;
				this.StopButton.Enabled = false;
				this.UnholdButton.Enabled = false;
			}
				
				
			else if (val == 6) {
				this.CurrentStateBox.Text = "RESETTING";
				
				this.AbortButton.Enabled = false;
				this.HoldButton.Enabled =  false;
				this.StartButton.Enabled = false;	
				this.SuspendButton.Enabled = false;
				this.UnsuspendButton.Enabled = false;
				this.ClearButton.Enabled = false;
				this.ResetButton.Enabled = false;
				this.StopButton.Enabled = false;
				this.UnholdButton.Enabled = false;
			}
				
			else if (val == 7) {
				this.CurrentStateBox.Text = "HOLDING";
				
				this.AbortButton.Enabled = false;
				this.HoldButton.Enabled =  false;
				this.StartButton.Enabled = false;	
				this.SuspendButton.Enabled = false;
				this.UnsuspendButton.Enabled = false;
				this.ClearButton.Enabled = false;
				this.ResetButton.Enabled = false;
				this.StopButton.Enabled = false;
				this.UnholdButton.Enabled = false;
			}
				
			else if (val == 8) {
				this.CurrentStateBox.Text = "HELD";
				
				this.AbortButton.Enabled = false;
				this.HoldButton.Enabled =  false;
				this.StartButton.Enabled = false;	
				this.SuspendButton.Enabled = false;
				this.UnsuspendButton.Enabled = false;
				this.ClearButton.Enabled = false;
				this.ResetButton.Enabled = false;
				this.StopButton.Enabled = false;
				this.UnholdButton.Enabled = true;
			}
				
			else if (val == 9) {
				this.CurrentStateBox.Text = "UNHOLDING";
				
				this.AbortButton.Enabled = false;
				this.HoldButton.Enabled =  false;
				this.StartButton.Enabled = false;	
				this.SuspendButton.Enabled = false;
				this.UnsuspendButton.Enabled = false;
				this.ClearButton.Enabled = false;
				this.ResetButton.Enabled = false;
				this.StopButton.Enabled = false;
				this.UnholdButton.Enabled = false;
			}
				
			else if (val == 10) {
				this.CurrentStateBox.Text = "SUSPENDING";
				
				this.AbortButton.Enabled = false;
				this.HoldButton.Enabled =  false;
				this.StartButton.Enabled = false;	
				this.SuspendButton.Enabled = false;
				this.UnsuspendButton.Enabled = false;
				this.ClearButton.Enabled = false;
				this.ResetButton.Enabled = false;
				this.StopButton.Enabled = false;
				this.UnholdButton.Enabled = false;
			}
				
			else if (val == 11) {
				this.CurrentStateBox.Text = "SUSPENDED";
				
				this.AbortButton.Enabled = false;
				this.HoldButton.Enabled =  false;
				this.StartButton.Enabled = false;	
				this.SuspendButton.Enabled = false;
				this.UnsuspendButton.Enabled = true;
				this.ClearButton.Enabled = false;
				this.ResetButton.Enabled = false;
				this.StopButton.Enabled = false;
				this.UnholdButton.Enabled = false;
			}
				
			else if (val == 12) {
				this.CurrentStateBox.Text = "UNSUSPENDING";
				
				this.AbortButton.Enabled = false;
				this.HoldButton.Enabled =  false;
				this.StartButton.Enabled = false;	
				this.SuspendButton.Enabled = false;
				this.UnsuspendButton.Enabled = false;
				this.ClearButton.Enabled = false;
				this.ResetButton.Enabled = false;
				this.StopButton.Enabled = false;
				this.UnholdButton.Enabled = false;
			}
				
			else if (val == 13) {
				this.CurrentStateBox.Text = "STOPPING";
				
				this.AbortButton.Enabled = true;
				this.HoldButton.Enabled =  false;
				this.StartButton.Enabled = false;	
				this.SuspendButton.Enabled = false;
				this.UnsuspendButton.Enabled = false;
				this.ClearButton.Enabled = false;
				this.ResetButton.Enabled = false;
				this.StopButton.Enabled = false;
				this.UnholdButton.Enabled = false;
			}
				
			else if (val == 14) {
				this.CurrentStateBox.Text = "STOPPED";
				
				this.AbortButton.Enabled = false;
				this.HoldButton.Enabled =  false;
				this.StartButton.Enabled = false;	
				this.SuspendButton.Enabled = false;
				this.UnsuspendButton.Enabled = false;
				this.ClearButton.Enabled = false;
				this.ResetButton.Enabled = true;
				this.StopButton.Enabled = false;
				this.UnholdButton.Enabled = false;
			}
				
			else if (val == 15)  {
				this.CurrentStateBox.Text = "ABORTING";
				
				this.AbortButton.Enabled = false;
				this.HoldButton.Enabled =  false;
				this.StartButton.Enabled = false;	
				this.SuspendButton.Enabled = false;
				this.UnsuspendButton.Enabled = false;
				this.ClearButton.Enabled = false;
				this.ResetButton.Enabled = false;
				this.StopButton.Enabled = false;
				this.UnholdButton.Enabled = false;
			}
				
			else if (val == 16) {
				this.CurrentStateBox.Text = "ABORTED";
				
				this.AbortButton.Enabled = false;
				this.HoldButton.Enabled =  false;
				this.StartButton.Enabled = false;	
				this.SuspendButton.Enabled = false;
				this.UnsuspendButton.Enabled = false;
				this.ClearButton.Enabled = true;
				this.ResetButton.Enabled = false;
				this.StopButton.Enabled = false;
				this.UnholdButton.Enabled = false;
			}
				
			else if (val == 17) {
				this.CurrentStateBox.Text = "CLEARING";
				
				this.AbortButton.Enabled = true;
				this.HoldButton.Enabled =  false;
				this.StartButton.Enabled = false;	
				this.SuspendButton.Enabled = false;
				this.UnsuspendButton.Enabled = false;
				this.ClearButton.Enabled = false;
				this.ResetButton.Enabled = false;
				this.StopButton.Enabled = false;
				this.UnholdButton.Enabled = false;
			}
		}
		
	}
}
